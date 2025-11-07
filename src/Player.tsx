import { createContext, useContext, useState } from "react"

import { create, type StoreApi, type UseBoundStore } from "zustand"
import { persist } from "zustand/middleware"
import { randomUUIDFallback } from "@/lib/uuid"
import { EdenClient } from "./lib/eden"

async function startPlaybackAPI(trackId: string) {
  const { data, error } = await EdenClient.api.player.post({ trackId })
  if (error) {
    return { data, error }
  }

  return { data, error }
}

export type Track = {
  id: string
  name: string
  duration: number
  artURL?: string
}

type PlayerState = {
  audio: HTMLAudioElement | undefined
  volume: number
  isPlaying: boolean
  // todo: improve loading states
  // https://goo.gl/LdLk22
  // todo: fix AbortError
  isLoading: boolean
  isError: boolean
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  setIsPlaying: (isPlaying: boolean) => void
  setTrack: (trackId: Track) => Promise<void>
  /** The public api for starting a new track. */
  playTrack: (track: Track) => void
  currentTime: number
  setCurrentTime: (currentTime: number) => void
  setDuration: (duration: number) => void
  setVolume: (newVolumeFraction: number) => void
  seek: (time: number) => void
  duration: number
  queueTracks: (Track & { queueId: string })[]
  queueIndex: number
  queueRemove: (trackIndex: number) => void
  queuePush: (track: Track) => void
  queueSkip: () => Track | undefined
  queuePrev: () => Track | undefined
  queueSet: (tracks: Track[], startAtIndex?: number) => void
  queueJump: (trackIndex: number) => Track | undefined
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

export function clamp(value: number, min = 0, max = 1): number {
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  return Math.min(Math.max(value, low), high)
}

export const useAudioPlayerBase = create<PlayerState>()(
  persist(
    (set, get) => {
      console.log("creating player store")
      return {
        isPlaying: false,
        isLoading: false,
        isError: false,
        audio: undefined,
        currentTime: 0,
        volume: 0.1,
        duration: 0,
        queueTracks: [],
        queueIndex: 0,
        setVolume: (newVolumeFraction) => {
          set({ volume: clamp(newVolumeFraction) })

          const el = get().audio
          if (!el) {
            return
          }

          el.volume = clamp(newVolumeFraction)
        },
        queuePush: (tr: Track) => {
          const queueTracks = [...get().queueTracks]
          queueTracks.push({ ...tr, queueId: randomUUIDFallback() })
          set({ queueTracks })
          if (!get().audio?.src) {
            get().setTrack(tr)
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
        queueJump: (trackIndex) => {
          const track = get().queueTracks[trackIndex]
          if (!track) {
            return
          }
          set({ queueIndex: trackIndex })
          get().setTrack(track)
          return track
        },
        queueRemove: (deleteIndex) => {
          console.log("deleteindex", 0, get().queueTracks)
          const exitsts = get().queueTracks[deleteIndex]
          if (!exitsts) {
            return
          }
          const queueTracks = [...get().queueTracks]
          queueTracks.splice(deleteIndex, 1)

          if (deleteIndex < get().queueIndex) {
            set({ queueIndex: get().queueIndex - 1, queueTracks })
          } else if (deleteIndex === get().queueIndex) {
            if (deleteIndex === 0) {
              // TODO: handle when user deletes last track
            } else {
              get().queueSkip()
              set({ queueTracks })
            }
          } else {
            set({ queueTracks })
          }
        },
        queueSet: (tracks, startAtIndex) => {
          const player = get()
          const start_track = tracks[startAtIndex ?? 0]

          set({
            queueIndex: startAtIndex ?? 0,
            queueTracks: tracks.map((tr) => ({
              ...tr,
              queueId: randomUUIDFallback(),
            })),
          })
          if (!start_track) {
            get().stop()
            return
          }
          player.setTrack(start_track)
        },
        setCurrentTime: (currentTime) => set({ currentTime }),
        seek: (time) => {
          const a = get().audio
          if (!a) {
            return
          }
          const clampedTime = clamp(time, 0, a.duration || 0)
          a.currentTime = clampedTime
          set({ currentTime: clampedTime })
        },
        setAudio: (audio) => set({ audio }),
        setDuration: (duration) => set({ duration }),
        setIsPlaying: (isPlaying) => set({ isPlaying }),
        playTrack: async (track) => {
          const player = get()
          set({
            queueIndex: 0,
            queueTracks: [{ ...track, queueId: randomUUIDFallback() }],
          })
          await player.setTrack(track)
        },
        setTrack: async (track) => {
          const a = get().audio
          console.log("setTrack", a, track)
          if (!a) {
            return
          }

          set({ isError: false, isLoading: true })

          const { data, error } = await startPlaybackAPI(track.id)

          if (error) {
            console.error("Error starting playback", { cause: error })
            set({ isError: true, isLoading: false })
            return
          }

          a.src = data.url
          a.load()
          await get().play()
        },
        play: async () => {
          console.log("try plays")
          const a = get().audio
          if (!a) {
            return
          }

          await a.play()

          set({ isPlaying: true, duration: a.duration })
        },
        stop: () => {
          set({
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            queueIndex: 0,
            queueTracks: [],
          })
          const el = get().audio
          if (!el) {
            return
          }
          el.src = ""
          el.load()
        },
        pause: () => {
          const a = get().audio
          if (!a) {
            return
          }
          a.pause()
          set({ isPlaying: false })
        },
      }
    },
    {
      name: "audio-player-storage",
      partialize: (state) => ({
        volume: state.volume,
      }),
    }
  )
)

export const useAudioPlayer = createSelectors(useAudioPlayerBase)

export const useCurrentTrack = () => {
  const index = useAudioPlayer.use.queueIndex()
  const tracks = useAudioPlayer.use.queueTracks()
  return tracks[index]
}
