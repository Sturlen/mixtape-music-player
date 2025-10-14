import * as React from "react"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from "react"

interface PlayerContextType {
  isPlaying: boolean
  play: () => void
  pause: () => void
  setTrack: (trackId: string) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const [isPlaying, setIsPlaying] = useState(false)

  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  function setTrack(id: string) {
    console.log("setTrack", id)
    if (!audioRef.current) {
      console.log("no")
      return
    }
    audioRef.current.src = `/api/playback/${id}`
    audioRef.current.play() // todo: should it auto play?
    console.log(audioRef.current, audioRef.current.src)
  }

  async function play() {
    return audioRef.current?.play()
  }

  function pause() {
    audioRef.current?.pause()
  }

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = new Audio()
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current = null
      }
    }
  }, [])

  return (
    <PlayerContext.Provider value={{ isPlaying, play, pause, setTrack }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const useAudioPlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider")
  }
  return context
}
