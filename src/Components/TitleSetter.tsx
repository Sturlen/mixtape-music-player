import { useEffect } from "react"
import { useCurrentTrack } from "@/Player"

/** Side-effect only component */
export const TitleSetter = () => {
  const currentTrack = useCurrentTrack()

  useEffect(() => {
    if (currentTrack) {
      document.title = `${currentTrack.name} - Mixtape`
    } else {
      document.title = "Mixtape"
    }
  }, [currentTrack])

  return null
}
