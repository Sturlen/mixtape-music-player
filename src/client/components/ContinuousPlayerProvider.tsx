import * as React from "react"
import {
  type PropsWithChildren,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react"
import {
  useAudioPlayer,
  useCurrentTrack,
  useEvents,
  useActiveFeedback,
} from "@/Player"
import { EdenClient } from "@/lib/eden"
import { useQuery } from "@tanstack/react-query"

async function fetchPlaybackData(trackId: string) {
  const { data, error } = await EdenClient.api.player.post({ trackId })
  if (error) {
    throw new Error("Playback error", { cause: error })
  }
  return data.url
}

// Audio element type for dual system
type AudioElement = "A" | "B"

interface AudioElementState {
  element: HTMLAudioElement | null
  sourceNode: MediaElementAudioSourceNode | null
  trackId: string | null
  duration: number
}

export const ContinuousPlayerProvider = ({ children }: PropsWithChildren) => {
  const {
    onCanPlay,
    onTimeUpdate,
    onDurationChange,
    onPlaying,
    onPaused,
    onPlay,
    onEnded,
    onEmptied,
    onLoadStart,
  } = useEvents()

  const volume = useAudioPlayer.use.volume()
  const requested_playback_state = useAudioPlayer.use.requestedPlaybackState()
  const is_loading = useActiveFeedback().isLoading
  const endSeek = useAudioPlayer.use.endSeek()
  const requestedSeekPosition = useAudioPlayer.use.requestedSeekPosition()
  const currentTrack = useCurrentTrack()
  const requestedSource = useAudioPlayer.use.requestedSource()
  const requestedVolume = useAudioPlayer.use.requestedVolume()

  // Web Audio Context and nodes
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)

  // Audio elements and their Web Audio nodes
  const audioA_ref = useRef<HTMLAudioElement>(null)
  const audioB_ref = useRef<HTMLAudioElement>(null)

  const audioState = useRef<Record<AudioElement, AudioElementState>>({
    A: {
      element: null,
      sourceNode: null,
      trackId: null,
      duration: 0,
    },
    B: {
      element: null,
      sourceNode: null,
      trackId: null,
      duration: 0,
    },
  })

  // Master volume node for overall volume control
  const masterGainNode = useRef<GainNode | null>(null)
  const activeElement = useAudioPlayer.use.activeElement()
  const setActiveElement = useAudioPlayer.use.setActiveElement()
  const nextTrackRef = useRef<string | null>(null)

  // Initialize Web Audio Context
  useEffect(() => {
    const ctx = new AudioContext()

    // Create master gain node once
    const masterGain = ctx.createGain()
    masterGain.gain.value = volume
    masterGain.connect(ctx.destination)
    masterGainNode.current = masterGain

    setAudioContext(ctx)

    return () => {
      // Cleanup audio context and disconnect nodes
      try {
        audioState.current.A.sourceNode?.disconnect()
        audioState.current.B.sourceNode?.disconnect()
        masterGainNode.current?.disconnect()
        ctx.close()
      } catch (error) {
        console.error("Cleanup failed:", error)
      }
    }
  }, [])

  // Initialize audio elements with Web Audio nodes (simplified)
  const initializeAudioElement = useCallback(
    (element: HTMLAudioElement, type: AudioElement) => {
      if (!audioContext) return

      try {
        const sourceNode = audioContext.createMediaElementSource(element)

        // Connect the audio graph: element -> sourceNode -> masterGain -> destination
        sourceNode.connect(masterGainNode.current!)

        // Store references
        audioState.current[type] = {
          element,
          sourceNode,
          trackId: null,
          duration: 0,
        }
      } catch (error) {
        console.error(`Failed to initialize audio element ${type}:`, error)
      }
    },
    [audioContext],
  )

  // Setup audio elements when context is ready
  useEffect(() => {
    if (!audioContext) return

    if (audioA_ref.current && !audioState.current.A.sourceNode) {
      initializeAudioElement(audioA_ref.current, "A")
    }
    if (audioB_ref.current && !audioState.current.B.sourceNode) {
      initializeAudioElement(audioB_ref.current, "B")
    }
  }, [audioContext, initializeAudioElement])

  // Get playback URL for current track
  const { data: currentSrc } = useQuery({
    queryKey: ["playback", currentTrack?.id],
    enabled: !!currentTrack,
    queryFn: async ({ queryKey }) => {
      return fetchPlaybackData(queryKey[1] ?? "")
    },
    staleTime: Infinity,
  })

  // Get playback URL for next track (preload)
  const currentQueueIndex = useAudioPlayer.use.queueIndex()
  const currentQueueTracks = useAudioPlayer.use.queueTracks()
  const queueSkip = useAudioPlayer.use.queueSkip()
  const nextTrack = currentQueueTracks[currentQueueIndex + 1]
  const { data: nextSrc } = useQuery({
    queryKey: ["playback-next", nextTrack?.id],
    enabled: !!nextTrack,
    queryFn: async ({ queryKey }) => {
      return fetchPlaybackData(queryKey[1] ?? "")
    },
    staleTime: Infinity,
  })

  // Debugging logs for transitions
  useEffect(() => {
    console.log("[DEBUG] Transition state:", {
      nextTrackRef: nextTrackRef.current,
      queueIndex: currentQueueIndex,
    })
  }, [nextTrackRef.current, currentQueueIndex])

  // Enhanced debugging logs for audio state
  useEffect(() => {
    console.log("[DEBUG] Audio state:", {
      A: audioState.current.A,
      B: audioState.current.B,
    })
  }, [audioState.current])

  // Transition lock to prevent overlapping transitions
  const transitionLock = useRef(false)

  // Simplified performSeamlessSwitch without async handling
  const performSeamlessSwitch = useCallback(
    (fromElement: AudioElement, toElement: AudioElement) => {
      console.log("[DEBUG] Performing seamless switch:", {
        fromElement,
        toElement,
        nextTrackRef: nextTrackRef.current,
        audioState: {
          A: audioState.current.A,
          B: audioState.current.B,
        },
      })

      const fromState = audioState.current[fromElement]
      const toState = audioState.current[toElement]

      if (!toState.element) {
        console.error("[DEBUG] Target audio element is null.")
        return
      }

      // Set the src explicitly and start playback
      toState.element.src = nextTrackRef.current || ""
      toState.element.play().catch((error) => {
        console.error("[DEBUG] Play failed during seamless switch:", error)
      })

      // Switch states immediately
      queueSkip()
      setActiveElement(toElement)

      // Update duration
      if (toState.duration > 0) {
        onDurationChange(toState.duration)
      }

      // Pause previous element
      fromState.element?.pause()
      console.log("[DEBUG] Seamless switch completed:", {
        activeElement: toElement,
        audioState: {
          A: audioState.current.A,
          B: audioState.current.B,
        },
      })
    },
    [queueSkip, onDurationChange, setActiveElement],
  )

  // Simplified handleTimeUpdate
  const handleTimeUpdate = (
    currentTime: number,
    duration: number,
    element: AudioElement,
  ) => {
    console.log("[DEBUG] handleTimeUpdate triggered:", {
      currentTime,
      duration,
      element,
      activeElement,
      nextTrackRef: nextTrackRef.current,
    })

    if (activeElement !== element || !duration || !nextTrackRef.current) return

    const TIME_THRESHOLD = 0.5 // seconds before end to start transition
    const timeRemaining = duration - currentTime

    if (timeRemaining <= TIME_THRESHOLD) {
      const inactiveElement = element === "A" ? "B" : "A"
      const inactiveState = audioState.current[inactiveElement]

      if (
        inactiveState.trackId === nextTrackRef.current &&
        inactiveState.element
      ) {
        performSeamlessSwitch(element, inactiveElement)
      }
    }
  }

  // Cleanup: clear old preloaded tracks that are no longer in queue
  useEffect(() => {
    const currentTrackIds = new Set(currentQueueTracks.map((t) => t.id))
    const [aTrackId, bTrackId] = [
      audioState.current.A.trackId,
      audioState.current.B.trackId,
    ]

    if (
      aTrackId &&
      !currentTrackIds.has(aTrackId) &&
      aTrackId !== currentTrack?.id
    ) {
      audioState.current.A.element?.pause()
      audioState.current.A.element!.src = ""
      audioState.current.A.trackId = null
    }

    if (
      bTrackId &&
      !currentTrackIds.has(bTrackId) &&
      bTrackId !== currentTrack?.id
    ) {
      audioState.current.B.element?.pause()
      audioState.current.B.element!.src = ""
      audioState.current.B.trackId = null
    }
  }, [currentQueueTracks, currentTrack?.id])

  // Master volume control
  useEffect(() => {
    if (masterGainNode.current) {
      masterGainNode.current.gain.value = volume
    }
  }, [volume])

  // Seek handling for active element
  useEffect(() => {
    const activeState = audioState.current[activeElement]
    if (activeState.element && requestedSeekPosition != undefined) {
      activeState.element.currentTime = requestedSeekPosition
      endSeek()
    }
  }, [requestedSeekPosition, activeElement, endSeek])

  // Handle source changes
  useEffect(() => {
    if (!currentSrc) return

    const activeState = audioState.current[activeElement]
    const inactiveElement = activeElement === "A" ? "B" : "A"
    const inactiveState = audioState.current[inactiveElement]

    // If we have a next track preloaded and it's the current track, switch to it
    if (
      nextTrackRef.current === currentTrack?.id &&
      inactiveState.trackId === currentTrack?.id
    ) {
      performSeamlessSwitch(inactiveElement, activeElement)
      return
    }

    // Load current track on active element
    if (activeState.element && activeState.trackId !== currentTrack?.id) {
      activeState.element.src = currentSrc
      activeState.element.load()
      activeState.trackId = currentTrack?.id ?? null

      // If we're supposed to be playing, start playback after loading
      if (requested_playback_state === "playing") {
        const attemptPlay = () => {
          if (!activeState.element || !activeState.element.paused) return
          activeState.element.play().catch((err) => {
            console.error("Play attempt failed:", err)
            // Retry after a short delay
            setTimeout(attemptPlay, 100)
          })
        }

        // Try to play immediately, and also after canPlay fires
        setTimeout(attemptPlay, 50)
      }
    }
  }, [
    currentSrc,
    currentTrack,
    activeElement,
    performSeamlessSwitch,
    requested_playback_state,
  ])

  // Handle playback state - unified approach
  useEffect(() => {
    const activeState = audioState.current[activeElement]
    if (!activeState.element) return

    if (requested_playback_state === "playing") {
      activeState.element
        .play()
        .catch((err) => console.error("Play failed:", err))
    } else {
      activeState.element.pause()
    }
  }, [requested_playback_state, activeElement])

  // Preload next track when available
  useEffect(() => {
    if (
      nextSrc &&
      nextTrack &&
      audioState.current[activeElement === "A" ? "B" : "A"].element
    ) {
      const inactiveElement = activeElement === "A" ? "B" : "A"
      const inactiveState = audioState.current[inactiveElement]

      if (inactiveState.element && inactiveState.trackId !== nextTrack.id) {
        inactiveState.element.src = nextSrc
        inactiveState.element.load()
        inactiveState.trackId = nextTrack.id
        nextTrackRef.current = nextTrack.id
      }
    }
  }, [nextSrc, nextTrack, activeElement])

  // Simple time update every 250ms - only update time, let events handle duration
  useEffect(() => {
    const interval = setInterval(() => {
      const activeState = audioState.current[activeElement]
      if (activeState.element) {
        onTimeUpdate(activeState.element.currentTime)
      }
    }, 250)

    return () => clearInterval(interval)
  }, [activeElement, onTimeUpdate])

  // Event handlers
  const createAudioEventHandlers = (element: AudioElement) => ({
    onDurationChange: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const duration = e.currentTarget.duration || 0
      // Update duration for both elements
      audioState.current[element].duration = duration

      // Update player duration from active element
      if (activeElement === element) {
        onDurationChange(duration)
      }
    },

    onPlaying: () => {
      if (activeElement === element) {
        onPlaying()
      }
    },

    onPlay: () => {
      if (activeElement === element) {
        onPlay()
      }
    },

    onPause: () => {
      if (activeElement === element) {
        onPaused()
      }
    },

    onEnded: () => {
      if (activeElement === element) {
        // Track end (seamless switch handles most cases)
        onEnded()
      }
    },

    onCanPlay: () => {
      if (activeElement === element) {
        onCanPlay()
      }
    },

    onEmptied: () => {
      if (activeElement === element) {
        onEmptied()
      }
    },

    onLoadStart: () => {
      if (activeElement === element) {
        onLoadStart()
      }
    },
  })

  const audioA_handlers = createAudioEventHandlers("A")
  const audioB_handlers = createAudioEventHandlers("B")

  return (
    <>
      {children}
      <audio ref={audioA_ref} {...audioA_handlers} crossOrigin="anonymous" />
      <audio ref={audioB_ref} {...audioB_handlers} crossOrigin="anonymous" />
    </>
  )
}
