import { useMediaSession } from "./lib/mediasession"
import { useAudioPlayer } from "./Player"

/** Connects the player state machine to browser mediasessions */
export function MediaSessionSync() {
  const isPlaying = useAudioPlayer.use.isPlaying()
  const currentTrack = useAudioPlayer.use.currentTrack()
  const ms = useMediaSession({
    playbackState: isPlaying ? "playing" : "paused",
    metadata: currentTrack ? { title: currentTrack.name } : undefined,
  })

  return null
}
