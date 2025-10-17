import * as React from "react"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from "react"

import { create, type StoreApi, type UseBoundStore } from "zustand"

export type Track = {
  name: string
  duration: number
  url: string
}

type PlayerState = {
  audio: HTMLAudioElement | undefined
  isPlaying: boolean
  // https://goo.gl/LdLk22
  // todo: fix AbortError
  isLoading: boolean
  currentTrack: Track | undefined
  play: () => Promise<void>
  pause: () => void
  setIsPlaying: (isPlaying: boolean) => void
  setTrack: (trackId: Track) => void
  /** The public api for starting a new track. */
  playTrack: (track: Track) => void
  currentTime: number
  setCurrentTime: (currentTime: number) => void
  setDuration: (duration: number) => void
  duration: number
  queueTracks: Track[]
  queueIndex: number
  queueRemove: (trackIndex: number) => void
  queuePush: (track: Track) => void
  queueSkip: () => Track | undefined
  queuePrev: () => Track | undefined
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
  currentTrack: undefined,
  duration: 0,
  queueTracks: [],
  queueIndex: 0,
  queuePush: (tr: Track) => {
    const queueTracks = [...get().queueTracks]
    queueTracks.push(tr)
    set({ queueTracks })
    if (!get().currentTrack) {
      get().queueSkip()
    }
  },
  queueSkip: () => {
    const next_track = get().queueTracks[get().queueIndex + 1]
    if (!next_track) {
      return
    }
    set({ queueIndex: get().queueIndex + 1 })
    get().setTrack(next_track)
    return next_track
  },
  queuePrev: () => {
    if (get().queueIndex <= 0) {
      return
    }
    const prev_track = get().queueTracks[get().queueIndex - 1]
    if (!prev_track) {
      return
    }
    set({ queueIndex: get().queueIndex - 1 })
    get().setTrack(prev_track)
    return prev_track
  },
  queueRemove: (deleteIndex) => {
    const exitsts = get().queueTracks[deleteIndex]
    if (!exitsts) {
      return
    }
    const queueTracks = [...get().queueTracks]
    queueTracks.splice(deleteIndex)

    if (deleteIndex === get().queueIndex) {
      // TODO: handle when user deletes currently playing track
      return
    }

    if (deleteIndex < get().queueIndex) {
      // TODO: handle when user deletes track before current track
      return
    }

    set({ queueTracks })
  },
  setCurrentTime: (currentTime) => set({ currentTime }),
  setAudio: (audio) => set({ audio }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  playTrack: (track) => {
    const player = get()
    set({ queueIndex: 0, queueTracks: [track] })
    player.setTrack(track)
  },
  setTrack: (track) => {
    const a = get().audio
    console.log("setTrack", a, track)
    if (!a) {
      return
    }
    set({ currentTrack: track })
    a.src = track.url
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
  const queueSkip = useAudioPlayer.use.queueSkip()

  useEffect(() => {
    const audio = new Audio()
    audio.volume = 0.1

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
  }, [])

  return children
}

function raise(message: string): never {
  throw new Error(message)
}
