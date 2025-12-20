import * as React from "react"
import {
  type PropsWithChildren,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react"
import { useAudioPlayer, useCurrentTrack, useEvents } from "@/Player"
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
  gainNode: GainNode | null
  trackId: string | null
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
  const is_loading = useAudioPlayer.use.isLoading()
  const endSeek = useAudioPlayer.use.endSeek()
  const requestedSeekPosition = useAudioPlayer.use.requestedSeekPosition()
  const currentTrack = useCurrentTrack()

  // Crossfade settings from store
  const crossfadeEnabled = useAudioPlayer.use.crossfadeEnabled()
  const crossfadeDuration = useAudioPlayer.use.crossfadeDuration()
  const setIsTransitioning = useAudioPlayer.use.setIsTransitioning()

  // Web Audio Context and nodes
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [activeElement, setActiveElement] = useState<AudioElement>("A")

  // Audio elements and their Web Audio nodes
  const audioA_ref = useRef<HTMLAudioElement>(null)
  const audioB_ref = useRef<HTMLAudioElement>(null)

  const audioState = useRef<Record<AudioElement, AudioElementState>>({
    A: { element: null, sourceNode: null, gainNode: null, trackId: null },
    B: { element: null, sourceNode: null, gainNode: null, trackId: null },
  })

  const isTransitioning = useAudioPlayer.use.isTransitioning()
  const nextTrackRef = useRef<string | null>(null)

  // Initialize Web Audio Context
  useEffect(() => {
    const ctx = new AudioContext()
    setAudioContext(ctx)

    return () => {
      // Cleanup audio context and disconnect nodes
      try {
        audioState.current.A.sourceNode?.disconnect()
        audioState.current.B.sourceNode?.disconnect()
        audioState.current.A.gainNode?.disconnect()
        audioState.current.B.gainNode?.disconnect()
        ctx.close()
      } catch (error) {
        console.warn("Cleanup error:", error)
      }
    }
  }, [])

  // Initialize audio elements with Web Audio nodes
  const initializeAudioElement = useCallback(
    (element: HTMLAudioElement, type: AudioElement) => {
      if (!audioContext) return

      try {
        const sourceNode = audioContext.createMediaElementSource(element)
        const gainNode = audioContext.createGain()

        // Connect the audio graph
        sourceNode.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Store references
        audioState.current[type] = {
          element,
          sourceNode,
          gainNode,
          trackId: null,
        }

        // Set initial gain
        gainNode.gain.value = type === activeElement ? 1 : 0
      } catch (error) {
        console.error(`Failed to initialize audio element ${type}:`, error)
      }
    },
    [audioContext, activeElement],
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
    enabled: !!nextTrack && !isTransitioning && crossfadeEnabled,
    queryFn: async ({ queryKey }) => {
      return fetchPlaybackData(queryKey[1] ?? "")
    },
    staleTime: Infinity,
  })

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

  // Volume control for both elements
  useEffect(() => {
    if (audioState.current.A.gainNode && audioState.current.B.gainNode) {
      // Apply volume to both gain nodes (they handle the crossfade)
      const currentGain =
        audioState.current.A.gainNode.gain.value > 0
          ? audioState.current.A.gainNode.gain.value
          : audioState.current.B.gainNode.gain.value
      const volumeMultiplier = volume

      if (audioState.current.A.gainNode.gain.value > 0) {
        audioState.current.A.gainNode.gain.value =
          currentGain * volumeMultiplier
      }
      if (audioState.current.B.gainNode.gain.value > 0) {
        audioState.current.B.gainNode.gain.value =
          currentGain * volumeMultiplier
      }
    }
  }, [volume])

  // Seek handling for active element
  useEffect(() => {
    const activeState = audioState.current[activeElement]
    if (activeState.element && requestedSeekPosition != undefined) {
      activeState.element.currentTime = requestedSeekPosition
      endSeek()
    }
  }, [requestedSeekPosition, activeElement])

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
      performCrossfade(inactiveElement, activeElement)
      return
    }

    // Load current track on active element
    if (activeState.element && activeState.trackId !== currentTrack?.id) {
      activeState.element.src = currentSrc
      activeState.element.load()
      activeState.trackId = currentTrack?.id ?? null
    }
  }, [currentSrc, currentTrack, activeElement])

  // Handle playback state
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

  // Handle loading state
  useEffect(() => {
    const activeState = audioState.current[activeElement]
    if (!activeState.element) return

    if (is_loading === false && requested_playback_state === "playing") {
      activeState.element
        .play()
        .catch((err) => console.error("Play failed:", err))
    }
  }, [is_loading, requested_playback_state, activeElement])

  // Crossfade function
  const performCrossfade = useCallback(
    (fromElement: AudioElement, toElement: AudioElement) => {
      if (!audioContext) return

      const fromState = audioState.current[fromElement]
      const toState = audioState.current[toElement]

      if (!fromState.gainNode || !toState.gainNode || !toState.element) {
        console.warn("Crossfade failed: missing audio nodes or elements")
        return
      }

      setIsTransitioning(true)

      const currentTime = audioContext.currentTime

      // Start the next element
      toState.element.play().catch((err) => {
        console.error("Next track play failed:", err)
        setIsTransitioning(false)
      })

      // Perform crossfade
      fromState.gainNode.gain.setValueAtTime(
        fromState.gainNode.gain.value,
        currentTime,
      )
      fromState.gainNode.gain.linearRampToValueAtTime(
        0,
        currentTime + crossfadeDuration,
      )

      toState.gainNode.gain.setValueAtTime(0, currentTime)
      toState.gainNode.gain.linearRampToValueAtTime(
        1,
        currentTime + crossfadeDuration,
      )
      fromState.gainNode.gain.linearRampToValueAtTime(
        0,
        currentTime + crossfadeDuration,
      )

      toState.gainNode.gain.setValueAtTime(0, currentTime)
      toState.gainNode.gain.linearRampToValueAtTime(
        1,
        currentTime + crossfadeDuration,
      )

      // Switch active element after crossfade
      setTimeout(() => {
        console.log("Crossfade complete - switching elements", {
          from: fromElement,
          to: toElement,
          nextTrackId: nextTrackRef.current,
        })
        setActiveElement(toElement)
        fromState.element?.pause()
        setIsTransitioning(false)
        nextTrackRef.current = null

        // Advance queue to the next track
        queueSkip()
      }, crossfadeDuration * 1000)
    },
    [audioContext, crossfadeDuration],
  )

  // Check for crossfade trigger
  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number, element: AudioElement) => {
      // Update player state
      onTimeUpdate(currentTime)

      // Only do crossfade if enabled
      if (!crossfadeEnabled) return

      // Check if we should start crossfade
      if (!isTransitioning && duration > 0) {
        const remainingTime = duration - currentTime
        const crossfadeStartTime = crossfadeDuration + 1 // Start 1 second before crossfade

        if (
          remainingTime <= crossfadeStartTime &&
          nextTrack &&
          nextSrc &&
          !nextTrackRef.current
        ) {
          // Preload the next track
          const nextElement = element === "A" ? "B" : "A"
          const nextState = audioState.current[nextElement]

          if (nextState.element && nextState.trackId !== nextTrack.id) {
            nextState.element.src = nextSrc
            nextState.element.load()
            nextState.trackId = nextTrack.id
            nextTrackRef.current = nextTrack.id
          }
        }

        // Start crossfade at the right moment
        if (remainingTime <= crossfadeDuration && nextTrackRef.current) {
          const nextElement = element === "A" ? "B" : "A"
          const nextState = audioState.current[nextElement]

          if (nextState.trackId === nextTrackRef.current) {
            performCrossfade(element, nextElement)
          }
        }
      }
    },
    [
      crossfadeEnabled,
      isTransitioning,
      nextTrack,
      nextSrc,
      onTimeUpdate,
      crossfadeDuration,
      performCrossfade,
    ],
  )

  // Event handlers
  const createAudioEventHandlers = (element: AudioElement) => ({
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const currentTime = e.currentTarget.currentTime
      const duration = e.currentTarget.duration || 0

      // Only update player time from active element
      if (activeElement === element) {
        onTimeUpdate(currentTime)
      }

      // Handle crossfade logic from both elements
      handleTimeUpdate(currentTime, duration, element)
    },

    onDurationChange: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      if (activeElement === element) {
        onDurationChange(e.currentTarget.duration)
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
      if (activeElement === element && !isTransitioning) {
        // Normal track end without crossfade
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
