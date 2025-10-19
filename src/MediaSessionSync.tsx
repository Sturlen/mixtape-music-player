import { useCallback } from "react"
import { useMediaSession } from "./lib/mediasession"
import { useAudioPlayer } from "./Player"

/** Connects the player state machine to browser mediasessions */
export function MediaSessionSync() {
  const isPlaying = useAudioPlayer.use.isPlaying()
  const currentTrack = useAudioPlayer.use.currentTrack()
  const queueSkip = useCallback(() => useAudioPlayer.use.queueSkip(), [])
  const queuePrev = useCallback(() => useAudioPlayer.use.queuePrev(), [])

  const artwork = currentTrack?.artURL
    ? [{ src: currentTrack?.artURL, sizes: "512x512" }]
    : []

  useMediaSession({
    playbackState: isPlaying ? "playing" : "paused",
    metadata: currentTrack
      ? { title: currentTrack.name, artwork: artwork }
      : undefined,
    handlers: {
      nexttrack: () => {
        queueSkip()
      },
      previoustrack: () => {
        queuePrev()
      },
    },
  })

  return null
}
