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
  play: () => void
  pause: () => void
  setTrack: (trackId: string) => void

  setAudio: (el?: HTMLAudioElement) => void
}

export const useAudioPlayer = create<PlayerState>((set, get) => ({
  isPlaying: false,
  audio: undefined,
  setAudio: (audio) => set({ audio }),
  setTrack: (trackId) => {
    const a = get().audio
    console.log("setTrack", a, trackId)
    if (!a) {
      return
    }
    a.src = `/api/playback/${trackId}`
    a.play()
  },
  play: () => {
    console.log("play")
    const a = get().audio
    a?.play()
    set({ isPlaying: true })
  },
  pause: () => {
    const a = get().audio
    a?.pause()
    set({ isPlaying: false })
  },
}))

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const setAudio = useAudioPlayer((s) => s.setAudio)

  useEffect(() => {
    setAudio(new Audio())
    console.log("audio set")
    return () => {
      setAudio()
    }
  }, [])

  return children
}
