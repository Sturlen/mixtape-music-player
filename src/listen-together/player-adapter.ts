import type { TrackRef } from "./types"
import { useAudioPlayer, type Track } from "@/Player"
import { EdenClient } from "@/lib/eden"

export type PlayerSnapshot = {
  track: TrackRef | null
  playbackState: "playing" | "paused"
  positionMs: number
  playbackRate: number
}

export interface PlayerAdapter {
  loadTrack(track: TrackRef): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  seek(positionMs: number): Promise<void>
  getSnapshot(): PlayerSnapshot
  onLocalPlayIntent?(cb: () => void): void
  onLocalPauseIntent?(cb: () => void): void
  onLocalSeekIntent?(cb: (positionMs: number) => void): void
}

function trackRefToTrack(ref: TrackRef): Track {
  return {
    id: ref.trackId,
    name: "",
    duration: ref.durationMs / 1000,
  }
}

export function createPlayerAdapter(): PlayerAdapter {
  return {
    async loadTrack(ref: TrackRef) {
      const store = useAudioPlayer.getState()
      const track: Track = { ...trackRefToTrack(ref) }
      store.queueSet([track], 0)
    },

    async play() {
      useAudioPlayer.getState().play()
    },

    async pause() {
      useAudioPlayer.getState().pause()
    },

    async seek(positionMs: number) {
      useAudioPlayer.getState().seek(positionMs / 1000)
    },

    getSnapshot(): PlayerSnapshot {
      const state = useAudioPlayer.getState()
      const currentTrack = useAudioPlayer.getState().queueTracks[useAudioPlayer.getState().queueIndex]
      return {
        track: currentTrack
          ? { trackId: currentTrack.id, durationMs: Math.round(currentTrack.duration * 1000) }
          : null,
        playbackState: state._playbackState,
        positionMs: state.currentTime * 1000,
        playbackRate: 1,
      }
    },
  }
}
