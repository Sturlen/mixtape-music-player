import * as React from "react"
import { type PropsWithChildren, useEffect } from "react"
import { useAudioPlayer } from "@/client/Player"

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const setAudio = useAudioPlayer.use.setAudio()
  const player_audio_el = useAudioPlayer.use.audio()
  const setCurrentTime = useAudioPlayer.use.setCurrentTime()
  const setDuration = useAudioPlayer.use.setDuration()
  const setIsPlaying = useAudioPlayer.use.setIsPlaying()
  const queueSkip = useAudioPlayer.use.queueSkip()
  const audio_el = React.useRef<HTMLAudioElement>(null)

  console.log(
    "audio html el",
    audio_el.current,
    "player store audio",
    player_audio_el
  )

  // on mount, set the audio element in the player store
  useEffect(() => {
    const audio = audio_el.current
    if (!audio) {
      return
    }

    setAudio(audio)
    audio.volume = useAudioPlayer.getState().volume
    return () => {
      setAudio()
    }
  }, [])

  return (
    <>
      {children}
      <audio
        ref={audio_el}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => queueSkip()}
      />
    </>
  )
}
