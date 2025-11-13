import { useCallback, useEffect } from "react"
import { useMediaSession } from "@/lib/mediasession"
import { useAudioPlayer, useCurrentTrack } from "@/Player"

/** Connects the player state machine to browser mediasessions API */
export function MediaSessionSync() {
  const isPlaying = useAudioPlayer.use.isPlaying()
  const currentTrack = useCurrentTrack()
  const queueSkip = useAudioPlayer.use.queueSkip()
  const queuePrev = useAudioPlayer.use.queuePrev()
  const seek = useAudioPlayer.use.seek()

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
      seekto: ({ seekTime }) => {
        if (!seekTime) {
          return
        }
        seek(seekTime)
      },
    },
  })

  return null
}
