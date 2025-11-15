import { create, type StoreApi, type UseBoundStore } from "zustand"
import { persist } from "zustand/middleware"
import { randomUUIDFallback } from "@/lib/uuid"
import { clamp } from "./lib/math"

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
  onAbort?(): void

  /**
   * Fired when the user agent can play the media, but estimates that not enough data
   * has been loaded to play the media up to its end without having to stop for further buffering.
   */
  onCanPlay(): void

  /**
   * Fired when the duration property has been updated.
   * @param durationSeconds The total duration of the media in seconds.
   */
  onDurationChange(durationSeconds: number): void

  /**
   * Fired when playback stops when end of the media is reached or because no further data is available.
   */
  onEnded(): void

  /**
   * Fired when the resource could not be loaded due to an error.
   * @param error The error that occurred.
   */
  onError?(error: Error): void

  /**
   * Fired when the browser has started to load a resource.
   */
  onLoadStart(): void

  /**
   * Fired when a request to pause play is handled and the activity has entered its paused state,
   * most commonly occurring when the HTMLMediaElement.pause() method is called.
   */
  onPaused(): void

  /**
   * Fired when the paused property is changed from true to false, as a result of the
   * HTMLMediaElement.play() method or the autoplay attribute.
   */
  onPlay(): void

  /**
   * Fired when playback is ready to start after having been paused or delayed due to lack of data.
   */
  onPlaying(): void

  onEmptied(): void

  /**
   * Fired when the time indicated by the currentTime property has been updated.
   * @param currentTimeSeconds The current playback position in seconds.
   */
  onTimeUpdate(currentTimeSeconds: number): void
}

type PublicAPI = {
  play: () => Promise<void>
  pause: () => void
  queueRemove: (trackIndex: number) => void
  queuePush: (track: Track) => void
  queueSkip: () => Track | undefined
  queuePrev: () => Track | undefined
  queueSet: (tracks: Track[], startAtIndex?: number) => void
  queueJump: (trackIndex: number) => Track | undefined
  setVolume: (newVolumeFraction: number) => void
  seek: (time: number) => void
}

type PlayerState = {
  volume: number
  isLoading: boolean
  isError: boolean
  _playbackState: "playing" | "paused"
  requestedPlaybackState: "playing" | "paused"
  requestedSeekPosition: number | undefined
  src: string | undefined
  currentTime: number
  duration: number
  queueTracks: (Track & { queueId: string })[]
  queueIndex: number
  events: MediaEventHandlers
  stop: () => void
  endSeek: () => void
} & PublicAPI

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

function log(message?: string, ...optionalParams: unknown[]) {
  console.log(`[PLAYER] ${message}`, ...optionalParams)
}

export const useAudioPlayerBase = create<PlayerState>()(
  persist(
    (set, get) => {
      log("creating player store")
      return {
        events: {
          onAbort: () => {
            log("Media loading aborted")
          },

          onLoadStart: () => {
            log("Start load")
            set({ isLoading: true, _playbackState: "paused" })
          },

          onCanPlay: () => {
            log("Media can start playing")
            set({ isLoading: false })
          },

          onTimeUpdate: (currentTimeSeconds) => {
            set({ currentTime: currentTimeSeconds })
          },

          onDurationChange: (durationSeconds) => {
            log(`Duration updated: ${durationSeconds}s`)
            set({ duration: durationSeconds })
          },

          onEnded: () => {
            log("Playback ended")
            get().queueSkip()
          },

          onEmptied: () => {
            log("source empty")
            set({ _playbackState: "paused" })
          },

          onError: (error) => {
            console.error("Media error:", error)
            set({ _playbackState: "paused" })
          },

          onPaused: () => {
            log("Playback paused")
            set({ _playbackState: "paused" })
          },

          onPlay: () => {
            log("Playback started")
            set({ _playbackState: "playing" })
          },

          onPlaying: () => {
            log("Playback is active")
            set({ _playbackState: "playing" })
          },
        },
        _playbackState: "paused",
        requestedPlaybackState: "paused",
        src: undefined,
        requestedSeekPosition: undefined,
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
          return prev_track
        },
        queueJump: (trackIndex) => {
          const track = get().queueTracks[trackIndex]
          if (!track) {
            return
          }
          set({ queueIndex: trackIndex })
          return track
        },
        queueRemove: (deleteIndex) => {
          log("deleteindex", 0, get().queueTracks)
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
        },
        seek: (time) => {
          set({ requestedSeekPosition: time })
        },
        endSeek: () => {
          set({ requestedSeekPosition: undefined })
        },
        play: async () => {
          log("try plays", get().queueTracks)

          if (get().queueTracks[get().queueIndex]) {
            set({ requestedPlaybackState: "playing" })
          }
        },
        stop: () => {
          set({
            requestedPlaybackState: "paused",
            currentTime: 0,
            duration: 0,
            queueIndex: 0,
            queueTracks: [],
            src: undefined,
          })
        },
        pause: () => {
          set({ requestedPlaybackState: "paused" })
        },
      }
    },
    {
      name: "audio-player-storage",
      partialize: (state) => ({
        volume: state.volume,
        queueTracks: state.queueTracks,
        queueIndex: state.queueIndex,
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

export const useIsPlaying = () => {
  const state = useAudioPlayer.use._playbackState()
  return state === "playing"
}

export const useEvents = () => {
  return useAudioPlayer((state) => state.events)
}
