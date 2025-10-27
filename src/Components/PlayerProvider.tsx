import * as React from "react"
import { type PropsWithChildren, useEffect } from "react"
import { useAudioPlayer } from "@/Player"

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const setAudio = useAudioPlayer.use.setAudio()
  const player_audio_el = useAudioPlayer.use.audio()
  const setCurrentTime = useAudioPlayer.use.setCurrentTime()
  const setIsPlaying = useAudioPlayer.use.setIsPlaying()
  const queueSkip = useAudioPlayer.use.queueSkip()
  const audio_el = React.useRef<HTMLAudioElement>(null)

  console.log(
    "audio html el",
    audio_el.current,
    "player store audio",
    player_audio_el
  )

  useEffect(() => {
    const audio = audio_el.current
    if (!audio) {
      console.log("no audio el")
      return
    }

    audio.volume = useAudioPlayer.getState().volume // volume is controlled by Player

    const onTime = () => setCurrentTime(audio.currentTime)
    const durationChange = () => setCurrentTime(audio.duration)
    const onPlaying = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => queueSkip()

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("durationchange", durationChange)
    audio.addEventListener("playing", onPlaying)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)

    setAudio(audio)
    console.log("audio set")
    return () => {
      setAudio()
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("durationchange", durationChange)
      audio.removeEventListener("playing", onPlaying)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
    }
  }, [player_audio_el]) // rerun on hmr to avoid stale references

  return (
    <>
      {children}
      <audio ref={audio_el} />
    </>
  )
}
