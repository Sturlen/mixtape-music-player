import { createContext, useContext, useState } from "react"

import { create, type StoreApi, type UseBoundStore } from "zustand"
import { persist } from "zustand/middleware"
import { randomUUIDFallback } from "@/lib/uuid"
import { EdenClient } from "@/lib/eden"
import { clamp } from "./lib/math"

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
  album?: {
    id: string
    name: string
  }
}

/**
 * Media event handlers for HTML media elements (audio/video).
 * Implement these methods to respond to various media playback events.
 */
type MediaEventHandlers = {
  /**
   * Fired when the resource was not fully loaded, but not as the result of an error.
   */
  OnAbort?(): void

  /**
   * Fired when the user agent can play the media, but estimates that not enough data
   * has been loaded to play the media up to its end without having to stop for further buffering.
   */
  OnCanPlay?(): void

  /**
   * Fired when the user agent can play the media, and estimates that enough data has been
   * loaded to play the media up to its end without having to stop for further buffering.
   */
  OnCanPlayThrough?(): void

  /**
   * Fired when the duration property has been updated.
   * @param durationSeconds The total duration of the media in seconds.
   */
  OnDurationChange(durationSeconds: number): void

  /**
   * Fired when the media has become empty; for example, when the HTMLMediaElement.load()
   * method is called to reload already loaded or partially loaded media.
   */
  OnEmptied?(): void

  /**
   * Fired when playback stops when end of the media is reached or because no further data is available.
   */
  OnEnded(): void

  /**
   * Fired when the resource could not be loaded due to an error.
   * @param error The error that occurred.
   */
  OnError?(error: Error): void

  /**
   * Fired when the first frame of the media has finished loading.
   */
  OnLoadedData?(): void

  /**
   * Fired when the metadata has been loaded.
   */
  OnLoadedMetadata?(): void

  /**
   * Fired when the browser has started to load a resource.
   */
  OnLoadStart?(): void

  /**
   * Fired when a request to pause play is handled and the activity has entered its paused state,
   * most commonly occurring when the HTMLMediaElement.pause() method is called.
   */
  OnPaused?(): void

  /**
   * Fired when the paused property is changed from true to false, as a result of the
   * HTMLMediaElement.play() method or the autoplay attribute.
   */
  OnPlay?(): void

  /**
   * Fired when playback is ready to start after having been paused or delayed due to lack of data.
   */
  OnPlaying?(): void

  /**
   * Fired periodically as the browser loads a resource.
   * @param loadedBytes The number of bytes loaded so far.
   * @param totalBytes The total number of bytes to load, or -1 if unknown.
   */
  OnProgress?(loadedBytes: number, totalBytes: number): void

  /**
   * Fired when the playback rate has changed.
   * @param rate The new playback rate (e.g., 1.0 for normal, 2.0 for 2x speed).
   */
  OnRateChange?(rate: number): void

  /**
   * Fired when a seek operation completes.
   * @param currentTimeSeconds The current playback position in seconds after seeking.
   */
  OnSeeked?(currentTimeSeconds: number): void

  /**
   * Fired when a seek operation begins.
   * @param targetTimeSeconds The target playback position in seconds being seeked to.
   */
  OnSeeking?(targetTimeSeconds: number): void

  /**
   * Fired when the user agent is trying to fetch media data, but data is unexpectedly not forthcoming.
   */
  OnStalled?(): void
  /**
   * Fired when the time indicated by the currentTime property has been updated.
   * @param currentTimeSeconds The current playback position in seconds.
   */
  OnTimeUpdate?(currentTimeSeconds: number): void

  /**
   * Fired when the volume has changed.
   * @param volume The new volume level (0.0 to 1.0).
   */
  OnVolumeChange?(volume: number): void

  /**
   * Fired when playback has stopped because of a temporary lack of data.
   */
  OnWaiting?(): void
}

type PlayerState = {
  volume: number
  isPlaying: boolean
  // todo: improve loading states
  // https://goo.gl/LdLk22
  // todo: fix AbortError
  isLoading: boolean
  isError: boolean
  requestedSeekPosition: number | undefined
  src: string | undefined
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
  endSeek: () => void
  duration: number
  queueTracks: (Track & { queueId: string })[]
  queueIndex: number
  queueRemove: (trackIndex: number) => void
  queuePush: (track: Track) => void
  queueSkip: () => Track | undefined
  queuePrev: () => Track | undefined
  queueSet: (tracks: Track[], startAtIndex?: number) => void
  queueJump: (trackIndex: number) => Track | undefined
} & MediaEventHandlers

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  const store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (const k of Object.keys(store.getState())) {
    // example straight from zustand docs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }

  return store
}

export const useAudioPlayerBase = create<PlayerState>()(
  persist(
    (set, get) => {
      console.log("creating player store")
      return {
        OnAbort: () => {
          console.log("Media loading aborted")
        },

        OnCanPlay: () => {
          console.log("Media can start playing")
        },

        OnDurationChange: (durationSeconds) => {
          console.log(`Duration updated: ${durationSeconds}s`)
          set({ duration: durationSeconds })
        },

        OnEmptied: () => {
          console.log("Media emptied")
        },

        OnEnded: () => {
          console.log("Playback ended")
          get().queueSkip()
        },

        OnError: (error) => {
          console.error("Media error:", error)
          // useMediaStore.setState({ error: error.message });
        },

        OnLoadedData: () => {
          console.log("First frame loaded")
        },

        OnLoadedMetadata: () => {
          console.log("Metadata loaded")
        },

        OnLoadStart: () => {
          console.log("Loading started")
          // useMediaStore.setState({ isLoading: true });
        },

        OnPaused: () => {
          console.log("Playback paused")
          // useMediaStore.setState({ isPlaying: false });
        },

        OnPlay: () => {
          console.log("Playback started")
          // useMediaStore.setState({ isPlaying: true });
        },

        OnPlaying: () => {
          console.log("Playback is active")
          // useMediaStore.setState({ isPlaying: true });
        },

        OnProgress: (loadedBytes, totalBytes) => {
          const percentage =
            totalBytes > 0 ? ((loadedBytes / totalBytes) * 100).toFixed(2) : 0
          console.log(`Loading: ${percentage}%`)
          // useMediaStore.setState({ loadProgress: percentage });
        },

        OnRateChange: (rate) => {
          console.log(`Playback rate changed to ${rate}x`)
          // useMediaStore.setState({ playbackRate: rate });
        },

        OnSeeked: (currentTimeSeconds) => {
          console.log(`Seek completed at ${currentTimeSeconds}s`)
          // useMediaStore.setState({ currentTime: currentTimeSeconds });
        },

        OnSeeking: (targetTimeSeconds) => {
          console.log(`Seeking to ${targetTimeSeconds}s`)
          // useMediaStore.setState({ isSeeking: true });
        },

        OnTimeUpdate: (currentTimeSeconds) => {
          console.log(`Current time: ${currentTimeSeconds}s`)
          // useMediaStore.setState({ currentTime: currentTimeSeconds });
        },

        OnVolumeChange: (volume) => {
          console.log(`Volume changed to ${(volume * 100).toFixed(0)}%`)
          // useMediaStore.setState({ volume });
        },
        src: undefined,
        requestedSeekPosition: undefined,
        isPlaying: false,
        isLoading: false,
        isError: false,
        currentTime: 0,
        volume: 0.1,
        duration: 0,
        queueTracks: [],
        queueIndex: 0,
        setVolume: (newVolumeFraction) => {
          set({ volume: clamp(newVolumeFraction) })
        },
        queuePush: (tr: Track) => {
          const queueTracks = [...get().queueTracks]
          queueTracks.push({ ...tr, queueId: randomUUIDFallback() })
          set({ queueTracks })
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
          set({ requestedSeekPosition: time })
        },
        endSeek: () => {
          set({ requestedSeekPosition: undefined })
        },
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
          console.log("setTrack", track)

          set({ isError: false, isLoading: true })

          const { data, error } = await startPlaybackAPI(track.id)

          if (error) {
            console.error("Error starting playback", { cause: error })
            set({ isError: true, isLoading: false })
            return
          }

          set({ src: data.url })

          await get().play()
        },
        play: async () => {
          console.log("try plays")

          if (get().queueTracks[get().queueIndex]) {
            set({ isPlaying: true })
          }
        },
        stop: () => {
          set({
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            queueIndex: 0,
            queueTracks: [],
            src: undefined,
          })
        },
        pause: () => {
          set({ isPlaying: false })
        },
      }
    },
    {
      name: "audio-player-storage",
      partialize: (state) => ({
        volume: state.volume,
      }),
    },
  ),
)

export const useAudioPlayer = createSelectors(useAudioPlayerBase)

export const useCurrentTrack = () => {
  const index = useAudioPlayer.use.queueIndex()
  const tracks = useAudioPlayer.use.queueTracks()
  return tracks[index]
}
