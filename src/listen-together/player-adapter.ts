import { useAudioPlayer } from "@/Player"
import { resolveTrack, resolveTracks } from "./track-resolver"
import type { PlayerSnapshot } from "./types"

export interface PlayerAdapter {
  loadTrack(trackId: string): Promise<void>
  loadQueue(trackIds: string[], index: number): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  seek(positionMs: number): Promise<void>
  getSnapshot(): PlayerSnapshot
}

export function createPlayerAdapter(): PlayerAdapter {
  return {
    async loadTrack(trackId: string) {
      const store = useAudioPlayer.getState()
      const track = await resolveTrack(trackId)
      store.queueSet([track], 0)
    },

    async loadQueue(trackIds: string[], index: number) {
      const store = useAudioPlayer.getState()
      const tracks = await resolveTracks(trackIds)
      store.queueSet(tracks, index)
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
        trackId: currentTrack?.id ?? null,
        queue: state.queueTracks.map((t) => t.id),
        queueIndex: state.queueIndex,
        playbackState: state._playbackState,
        positionMs: state.currentTime * 1000,
      }
    },
  }
}
