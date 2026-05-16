import { useEffect, useRef } from "react"
import { useListenTogetherStore } from "./store"
import { ListenTogetherClient } from "./sync-client"
import { createPlayerAdapter } from "./player-adapter"
import { getOrCreateClientId } from "./room-id"
import type { TrackRef } from "./types"
import { useAudioPlayerBase } from "@/Player"

const PARTYKIT_HOST = "localhost:1999"

function getCurrentTrackRef(): TrackRef | undefined {
  const state = useAudioPlayerBase.getState()
  const track = state.queueTracks[state.queueIndex]
  if (!track) return undefined
  return { trackId: track.id, durationMs: Math.round(track.duration * 1000) }
}

export function ListenTogetherProvider() {
  const roomId = useListenTogetherStore((s) => s.roomId)

  useEffect(() => {
    if (!roomId) return

    const clientId = getOrCreateClientId()
    const player = createPlayerAdapter()

    const client = new ListenTogetherClient({
      partyHost: PARTYKIT_HOST,
      roomId,
      clientId,
      player,
      callbacks: {
        onState: (state) => {
          const store = useListenTogetherStore.getState()
          store.setHost(state.hostClientId === clientId)
          store.setEnded(state.ended)
        },
        onConnectionChange: (connected) => {
          useListenTogetherStore.getState().setConnected(connected)
        },
      },
    })

    client.connect()

    const unsub = useAudioPlayerBase.subscribe((state, prev) => {
      if (client.syncing) return

      const store = useListenTogetherStore.getState()
      if (!store.roomId || !store.isHost || store.isEnded) return

      const trackChanged =
        state.queueTracks[state.queueIndex]?.id !==
        prev.queueTracks[prev.queueIndex]?.id
      const playbackChanged =
        state.requestedPlaybackState !== prev.requestedPlaybackState
      const seekChanged =
        state.requestedSeekPosition !== undefined &&
        state.requestedSeekPosition !== prev.requestedSeekPosition

      if (trackChanged || playbackChanged) {
        if (state.requestedPlaybackState === "playing") {
          client.play(getCurrentTrackRef())
        } else {
          client.pause()
        }
        return
      }

      if (seekChanged && state.requestedSeekPosition !== undefined) {
        client.seek(state.requestedSeekPosition * 1000)
      }
    })

    return () => {
      unsub()
      client.disconnect()
      useListenTogetherStore.getState().clear()
    }
  }, [roomId])

  return null
}
