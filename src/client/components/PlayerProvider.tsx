import * as React from "react"
import { type PropsWithChildren, useEffect } from "react"
import { useAudioPlayer, useCurrentTrack, useEvents } from "@/Player"

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const {
    onCanPlay,
    onTimeUpdate,
    onDurationChange,
    onPlaying,
    onPaused,
    onPlay,
    onEnded,
    onEmptied,
    onLoadStart,
  } = useEvents()

  const volume = useAudioPlayer.use.volume()
  const requested_playback_state = useAudioPlayer.use.requestedPlaybackState()
  const is_loading = useAudioPlayer.use.isLoading()
  const src = useAudioPlayer.use.src()
  const endSeek = useAudioPlayer.use.endSeek()
  const requestedSeekPosition = useAudioPlayer.use.requestedSeekPosition()
  const currentTrack = useCurrentTrack()

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

    console.log("is_playing", requested_playback_state)

    if (requested_playback_state == "playing") {
      audio_ref.current
        .play()
        .catch((err) => console.error("Play failed:", err))
    } else {
      console.log("Pause")
      audio_ref.current.pause()
    }
  }, [requested_playback_state])

  useEffect(() => {
    if (!audio_ref.current) return

    console.log("is_loading", [is_loading, requested_playback_state])

    if (is_loading === false && requested_playback_state == "playing") {
      audio_ref.current
        .play()
        .catch((err) => console.error("Play failed:", err))
    }
  }, [is_loading, requested_playback_state])

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
        onCanPlay={onCanPlay}
        onEmptied={onEmptied}
        onLoadStart={onLoadStart}
      />
    </>
  )
}
