import { useEffect } from "react"
import { useAudioPlayer } from "@/Player"

/** Side-effect only component */
export const TitleSetter = () => {
  const currentTrack = useAudioPlayer.use.currentTrack()

  useEffect(() => {
    if (currentTrack) {
      document.title = `${currentTrack.name} - Mixtape`
    } else {
      document.title = "Mixtape"
    }
  }, [currentTrack])

  return null
}
