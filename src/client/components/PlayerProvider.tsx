import * as React from "react"
import { type PropsWithChildren, useEffect } from "react"
import { useAudioPlayer, useCurrentTrack } from "@/Player"
import { stat } from "fs"

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const setCurrentTime = useAudioPlayer.use.setCurrentTime()
  const setDuration = useAudioPlayer.use.setDuration()
  const setIsPlaying = useAudioPlayer.use.setIsPlaying()
  const queueSkip = useAudioPlayer.use.queueSkip()
  const audio_el = React.useRef<HTMLAudioElement>(null)
  const onDurationChange = useAudioPlayer((state) => state.OnDurationChange)
  const volume = useAudioPlayer((state) => state.volume)
  const is_playing = useAudioPlayer((state) => state.isPlaying)
  const currentTrack = useCurrentTrack()
  const src = useAudioPlayer((state) => state.src)

  // on mount, set the audio element in the player store
  useEffect(() => {
    const audio = audio_el.current
    if (!audio) {
      return
    }

    audio.volume = useAudioPlayer.getState().volume
    return () => {}
  }, [])

  // this is how we send commands to the audio element

  useEffect(() => {
    if (audio_el.current) {
      audio_el.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    if (audio_el.current) {
      audio_el.current.src = src ?? ""
      audio_el.current.load()
    }
  }, [src])

  useEffect(() => {
    if (!audio_el.current) return

    if (is_playing) {
      audio_el.current.play().catch((err) => console.error("Play failed:", err))
    } else {
      audio_el.current.pause()
    }
  }, [is_playing])

  return (
    <>
      {children}
      <audio
        ref={audio_el}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => queueSkip()}
      />
    </>
  )
}
