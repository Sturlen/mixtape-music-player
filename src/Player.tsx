import * as React from "react"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from "react"

import { create } from "zustand"

type PlayerState = {
  audio: HTMLAudioElement | undefined
  isPlaying: boolean
  // https://goo.gl/LdLk22
  // todo: fix AbortError
  isLoading: boolean
  play: () => Promise<void>
  pause: () => void
  setIsPlaying: (isPlaying: boolean) => void
  setTrack: (trackId: string) => void
  currentTime: number
  setCurrentTime: (currentTime: number) => void
  setDuration: (duration: number) => void
  duration: number

  setAudio: (el?: HTMLAudioElement) => void
}

export const useAudioPlayer = create<PlayerState>((set, get) => ({
  isPlaying: false,
  isLoading: false,
  audio: undefined,
  currentTime: 0,
  duration: 0,
  setCurrentTime: (currentTime) => set({ currentTime }),
  setAudio: (audio) => set({ audio }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setTrack: (trackId) => {
    const a = get().audio
    console.log("setTrack", a, trackId)
    if (!a) {
      return
    }
    a.src = `/api/playback/${trackId}`
    get().play()
  },
  play: async () => {
    console.log("try play")
    const a = get().audio
    const isLoading = get().isLoading
    if (!a) {
      return
    }

    if (isLoading) {
      console.log("player is already loading")
      return
    }
    try {
      set({ isLoading: true })
      await a.play()
    } catch (error) {
      console.error(error)
    } finally {
      set({ isLoading: false })
    }

    set({ isPlaying: true, duration: a.duration })
  },
  pause: () => {
    const a = get().audio
    const playPromise = get().isLoading
    if (!a || playPromise) {
      return
    }
    a.pause()
    set({ isPlaying: false })
  },
}))

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const setAudio = useAudioPlayer((s) => s.setAudio)
  const setCurrentTime = useAudioPlayer((s) => s.setCurrentTime)
  const setIsPlaying = useAudioPlayer((s) => s.setIsPlaying)

  useEffect(() => {
    const audio = new Audio()
    audio.volume = 0.1

    const onTime = () => setCurrentTime(audio.currentTime)
    const durationChange = () => setCurrentTime(audio.duration)
    const onPlaying = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("durationchange", durationChange)
    audio.addEventListener("playing", onPlaying)
    audio.addEventListener("pause", onPause)

    setAudio(audio)
    console.log("audio set")
    return () => {
      setAudio()
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("durationchange", durationChange)
      audio.removeEventListener("playing", onPlaying)
      audio.removeEventListener("pause", onPause)
    }
  }, [])

  return children
}
