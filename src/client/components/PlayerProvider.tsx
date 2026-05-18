import * as React from "react"
import { type PropsWithChildren, useEffect } from "react"
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

export const PlayerProvider = ({ children }: PropsWithChildren) => {
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
  const requested_playback_rate = useAudioPlayer.use.requestedPlaybackRate()
  const is_loading = useAudioPlayer.use.isLoading()
  const endSeek = useAudioPlayer.use.endSeek()
  const requestedSeekPosition = useAudioPlayer.use.requestedSeekPosition()
  const currentTrack = useCurrentTrack()

  const audio_ref = React.useRef<HTMLAudioElement>(null)
  const audio_ctx_ref = React.useRef<AudioContext | null>(null)
  const gain_node_ref = React.useRef<GainNode | null>(null)
  const keepalive_ref = React.useRef<OscillatorNode | null>(null)

  const saved_current_time = useAudioPlayer.use.currentTime()

  const { data: src } = useQuery({
    queryKey: ["playback", currentTrack?.id],
    enabled: !!currentTrack,
    queryFn: async ({ queryKey }) => {
      return fetchPlaybackData(queryKey[1] ?? "")
    },
    staleTime: Infinity,
  })

  // Restore playback position after reload
  const initial_seek_ref = React.useRef(false)
  useEffect(() => {
    if (initial_seek_ref.current) return
    if (!currentTrack || saved_current_time <= 0) return
    initial_seek_ref.current = true
    useAudioPlayer.getState().seek(saved_current_time)
  }, [currentTrack, saved_current_time])

  function initAudio() {
    if (audio_ctx_ref.current || !audio_ref.current) return

    const ctx = new AudioContext()
    audio_ctx_ref.current = ctx

    // Silent keepalive oscillator — keeps AudioContext in "running" state
    // so mobile browsers don't suspend the page between tracks
    const osc = ctx.createOscillator()
    const silent = ctx.createGain()
    silent.gain.value = 0
    osc.connect(silent)
    silent.connect(ctx.destination)
    osc.start()
    keepalive_ref.current = osc

    // Master gain node
    // Future: insert EQ nodes (BiquadFilterNode, etc.) between source and gain
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain_node_ref.current = gain

    // Connect audio element through Web Audio pipeline
    const source = ctx.createMediaElementSource(audio_ref.current)
    source.connect(gain)
  }

  // Initialize audio context on mount (gain node available immediately for volume)
  useEffect(() => {
    initAudio()
  }, [])

  // Resume context on play
  useEffect(() => {
    if (requested_playback_state !== "playing") return

    const ctx = audio_ctx_ref.current
    if (ctx?.state === "suspended") {
      ctx.resume()
    }
  }, [requested_playback_state])

  // Volume through gain node
  useEffect(() => {
    if (gain_node_ref.current) {
      gain_node_ref.current.gain.value = volume
    }
  }, [volume])

  // Seek
  useEffect(() => {
    if (audio_ref.current && requestedSeekPosition != undefined) {
      audio_ref.current.currentTime = requestedSeekPosition
      endSeek()
    }
  }, [requestedSeekPosition])

  // Load new src
  useEffect(() => {
    if (audio_ref.current) {
      audio_ref.current.src = src ?? ""
      audio_ref.current.load()
    }
  }, [src])

  // Play/pause
  useEffect(() => {
    if (!audio_ref.current) return

    console.log("is_playing", requested_playback_state)

    if (requested_playback_state == "playing") {
      audio_ref.current
        .play()
        .catch((err) => console.error("Play failed:", err))
    } else {
      console.log("Pause")
      audio_ref.current.pause()
    }
  }, [requested_playback_state])

  // Playback rate
  useEffect(() => {
    if (audio_ref.current) {
      audio_ref.current.playbackRate = requested_playback_rate
    }
  }, [requested_playback_rate])

  // Auto-play after loading completes
  useEffect(() => {
    if (!audio_ref.current) return

    if (is_loading === false && requested_playback_state == "playing") {
      audio_ref.current
        .play()
        .catch((err) => console.error("Play failed:", err))
    }
  }, [is_loading, requested_playback_state])

  return (
    <>
      {children}
      <audio
        ref={audio_ref}
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
        onPlaying={onPlaying}
        onPlay={onPlay}
        onPause={onPaused}
        onEnded={onEnded}
        onCanPlay={onCanPlay}
        onEmptied={onEmptied}
        onLoadStart={onLoadStart}
        src={src}
      />
    </>
  )
}
