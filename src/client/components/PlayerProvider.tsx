import * as React from "react"
import { type PropsWithChildren, useEffect } from "react"
import { useAudioPlayer } from "@/Player"

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const setIsPlaying = useAudioPlayer.use.setIsPlaying()
  const onTimeUpdate = useAudioPlayer.use.OnTimeUpdate()
  const onDurationChange = useAudioPlayer.use.OnDurationChange()
  const onPlaying = useAudioPlayer.use.OnPlaying()
  const onPaused = useAudioPlayer.use.OnPaused()
  const onPlay = useAudioPlayer.use.OnPlay()
  const onEnded = useAudioPlayer.use.OnEnded()
  const volume = useAudioPlayer.use.volume()
  const is_playing = useAudioPlayer.use.isPlaying()
  const src = useAudioPlayer.use.src()
  const endSeek = useAudioPlayer.use.endSeek()
  const requestedSeekPosition = useAudioPlayer.use.requestedSeekPosition()

  const audio_ref = React.useRef<HTMLAudioElement>(null)

  // on mount, set the audio element in the player store
  useEffect(() => {
    if (audio_ref.current) {
      audio_ref.current.volume = volume
    }
  }, [volume])

  // this is how we send commands to the audio element

  useEffect(() => {
    if (audio_ref.current && requestedSeekPosition != undefined) {
      audio_ref.current.currentTime = requestedSeekPosition
      endSeek()
    }
  }, [requestedSeekPosition])

  useEffect(() => {
    if (audio_ref.current) {
      audio_ref.current.src = src ?? ""
      audio_ref.current.load()
    }
  }, [src])

  useEffect(() => {
    if (!audio_ref.current) return

    if (is_playing) {
      audio_ref.current
        .play()
        .catch((err) => console.error("Play failed:", err))
    } else {
      audio_ref.current.pause()
    }
  }, [is_playing])

  return (
    <>
      {children}
      <audio
        ref={audio_ref}
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
        onPlaying={onPlaying}
        onPlay={onPlay}
        onPause={onPaused}
        onEnded={onEnded}
      />
    </>
  )
}
