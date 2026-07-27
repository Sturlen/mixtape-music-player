import * as React from "react"
import { type PropsWithChildren, useEffect } from "react"
import { useAudioPlayer, useCurrentTrack, useEvents } from "@/Player"
import { EdenClient } from "@/lib/eden"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSettings } from "@/client/stores/settings"
import { HlsPlayer } from "./HlsPlayer"

async function fetchPlaybackData(trackId: string) {
  const { data, error } = await EdenClient.api.player.post({ trackId })
  if (error) {
    throw new Error("Playback error", { cause: error })
  }

  return data.url
}

function streamUrl(trackId: string) {
  return `/api/stream/${trackId}`
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
    onError,
  } = useEvents()

  const volume = useAudioPlayer.use.volume()
  const requested_playback_state = useAudioPlayer.use.requestedPlaybackState()
  const requested_playback_rate = useAudioPlayer.use.requestedPlaybackRate()
  const is_loading = useAudioPlayer.use.isLoading()
  const endSeek = useAudioPlayer.use.endSeek()
  const requestedSeekPosition = useAudioPlayer.use.requestedSeekPosition()
  const currentTrack = useCurrentTrack()
  const currentTime = useAudioPlayer.use.currentTime()

  const audio_ref = React.useRef<HTMLAudioElement>(null)

  const saved_current_time = useAudioPlayer.use.currentTime()
  const hlsEnabled = useSettings((s) => s.values.hls_enabled) as boolean
  const queryClient = useQueryClient()

  const { data: src } = useQuery({
    queryKey: ["playback", currentTrack?.id, hlsEnabled] as const,
    enabled: !!currentTrack,
    queryFn: async ({ queryKey }) => {
      const trackId = queryKey[1] ?? ""
      if (hlsEnabled) return streamUrl(trackId)
      return fetchPlaybackData(trackId)
    },
    staleTime: Infinity,
  })

  // Prefetch next track URL when nearing the end of current track
  const queueTracks = useAudioPlayer.use.queueTracks()
  const queueIndex = useAudioPlayer.use.queueIndex()
  const nextTrack = queueTracks[queueIndex + 1]
  const prefetchedRef = React.useRef<string | null>(null)

  useEffect(() => {
    if (!currentTrack?.duration) return
    const nearEnd = currentTime / currentTrack.duration >= 0.85
    if (!nearEnd) return
    if (prefetchedRef.current === currentTrack.id) return

    const target = nextTrack
    if (!target) return

    prefetchedRef.current = currentTrack.id
    queryClient.prefetchQuery({
      queryKey: ["playback", target.id, hlsEnabled],
      queryFn: async () => {
        if (hlsEnabled) return streamUrl(target.id)
        return fetchPlaybackData(target.id)
      },
      staleTime: Infinity,
    })
  }, [currentTime, currentTrack?.id, nextTrack?.id, hlsEnabled, queryClient])

  // Reset prefetch guard when current track changes
  useEffect(() => {
    prefetchedRef.current = null
  }, [currentTrack?.id])

  // Restore playback position after reload
  const initial_seek_ref = React.useRef(false)
  useEffect(() => {
    if (initial_seek_ref.current) return
    if (!currentTrack || saved_current_time <= 0) return
    initial_seek_ref.current = true
    useAudioPlayer.getState().seek(saved_current_time)
  }, [currentTrack, saved_current_time])

  // Volume
  useEffect(() => {
    if (audio_ref.current) {
      audio_ref.current.volume = volume
    }
  }, [volume])

  // Seek
  useEffect(() => {
    if (audio_ref.current && requestedSeekPosition != undefined) {
      audio_ref.current.currentTime = requestedSeekPosition
      endSeek()
    }
  }, [requestedSeekPosition])

  // Load new src with autoplay
  useEffect(() => {
    if (!audio_ref.current) return
    audio_ref.current.autoplay = src != null
    audio_ref.current.src = src ?? ""
    audio_ref.current.load()
  }, [src])

  // Play/pause
  useEffect(() => {
    if (!audio_ref.current) return

    if (requested_playback_state == "playing") {
      audio_ref.current
        .play()
        .catch((err) => console.error("Play failed:", err))
    } else {
      audio_ref.current.pause()
    }
  }, [requested_playback_state])

  // Playback rate
  useEffect(() => {
    if (audio_ref.current) {
      audio_ref.current.playbackRate = requested_playback_rate
    }
  }, [requested_playback_rate])

  // Sync playback speed from settings store to player store
  const settingsSpeed = useSettings((s) => s.values.playback_speed) as number
  useEffect(() => {
    useAudioPlayer.getState().setPlaybackRate(settingsSpeed)
  }, [settingsSpeed])

  // Auto-play after loading completes
  useEffect(() => {
    if (!audio_ref.current) return

    if (is_loading === false && requested_playback_state == "playing") {
      audio_ref.current
        .play()
        .catch((err) => console.error("Play failed:", err))
    }
  }, [is_loading, requested_playback_state])

  // Resume playback when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      const state = useAudioPlayer.getState()
      if (
        state.requestedPlaybackState === "playing" &&
        audio_ref.current?.paused
      ) {
        audio_ref.current
          .play()
          .catch((err) => console.error("Resume playback failed:", err))
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  return (
    <>
      {children}
      <HlsPlayer src={src} audioRef={audio_ref} enabled={hlsEnabled} />
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
        onError={(e) => {
          const el = e.currentTarget
          const msg = el.error?.message
            ? `MediaError: ${el.error.message}`
            : "Media playback error"
          onError?.(new Error(msg))
        }}
      />
    </>
  )
}
