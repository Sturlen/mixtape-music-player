import { useCallback, useEffect } from "react"
import { useMediaSession } from "@/lib/mediasession"
import { useAudioPlayer, useCurrentTrack, useIsPlaying } from "@/Player"

/** Connects the player state machine to browser mediasessions API */
export function MediaSessionSync() {
  const isPlaying = useIsPlaying()
  const currentTrack = useCurrentTrack()
  const queueSkip = useAudioPlayer.use.queueSkip()
  const queuePrev = useAudioPlayer.use.queuePrev()
  const seek = useAudioPlayer.use.seek()
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const currentTime = useAudioPlayer.use.currentTime()
  const duration = useAudioPlayer.use.duration()

  const artwork = currentTrack?.artURL
    ? [{ src: currentTrack?.artURL, sizes: "512x512" }]
    : []

  useMediaSession({
    playbackState: isPlaying ? "playing" : "paused",
    metadata: currentTrack
      ? { title: currentTrack.name, artwork: artwork }
      : undefined,
    handlers: {
      play: () => {
        play()
      },
      pause: () => {
        pause()
      },
      nexttrack: () => {
        queueSkip()
      },
      previoustrack: () => {
        queuePrev()
      },
      seekto: ({ seekTime }) => {
        if (!seekTime) {
          return
        }
        seek(seekTime)
      },
    },
  })

  // Sync lock-screen playback position
  useEffect(() => {
    if (!("setPositionState" in (navigator.mediaSession ?? {}))) return
    if (!currentTrack) {
      navigator.mediaSession.setPositionState?.()
      return
    }
    try {
      navigator.mediaSession.setPositionState({
        duration: duration || currentTrack.duration || 0,
        playbackRate: 1,
        position: currentTime,
      })
    } catch {
      // setPositionState can throw if called before metadata is set
    }
  }, [currentTime, duration, currentTrack])

  return null
}
