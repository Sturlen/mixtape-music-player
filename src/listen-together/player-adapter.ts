import type { TrackRef } from "./types"
import { useAudioPlayer, type Track } from "@/Player"

export type PlayerSnapshot = {
  track: TrackRef | null
  queue: TrackRef[]
  queueIndex: number
  playbackState: "playing" | "paused"
  positionMs: number
}

export interface PlayerAdapter {
  loadTrack(track: TrackRef): Promise<void>
  loadQueue(tracks: TrackRef[], index: number): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  seek(positionMs: number): Promise<void>
  getSnapshot(): PlayerSnapshot
}

function trackRefToTrack(ref: TrackRef): Track {
  return {
    id: ref.trackId,
    name: "",
    duration: ref.durationMs / 1000,
  }
}

function trackToTrackRef(track: Track & { queueId: string }): TrackRef {
  return {
    trackId: track.id,
    durationMs: Math.round(track.duration * 1000),
  }
}

export function createPlayerAdapter(): PlayerAdapter {
  return {
    async loadTrack(ref: TrackRef) {
      const store = useAudioPlayer.getState()
      const track: Track = { ...trackRefToTrack(ref) }
      store.queueSet([track], 0)
    },

    async loadQueue(tracks: TrackRef[], index: number) {
      const store = useAudioPlayer.getState()
      store.queueSet(tracks.map(trackRefToTrack), index)
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
      const currentTrack = state.queueTracks[state.queueIndex]
      return {
        track: currentTrack ? trackToTrackRef(currentTrack) : null,
        queue: state.queueTracks.map(trackToTrackRef),
        queueIndex: state.queueIndex,
        playbackState: state._playbackState,
        positionMs: state.currentTime * 1000,
      }
    },
  }
}
