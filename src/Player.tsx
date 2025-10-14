import * as React from "react"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from "react"

import { create, type StoreApi, type UseBoundStore } from "zustand"

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

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  const store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (const k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }

  return store
}

export const useAudioPlayerBase = create<PlayerState>((set, get) => ({
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

export const useAudioPlayer = createSelectors(useAudioPlayerBase)

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const setAudio = useAudioPlayer.use.setAudio()
  const setCurrentTime = useAudioPlayer.use.setCurrentTime()
  const setIsPlaying = useAudioPlayer.use.setIsPlaying()

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
