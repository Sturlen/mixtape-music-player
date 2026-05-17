import { useEffect } from "react"
import { useListenTogetherStore } from "./store"
import { ListenTogetherClient } from "./sync-client"
import { createPlayerAdapter } from "./player-adapter"
import { getOrCreateClientId } from "./room-id"
import { useAudioPlayerBase } from "@/Player"

const PARTYKIT_HOST = "https://mixtape-listen-together.sturlen.partykit.dev"

function getRoomParam(): string | null {
  return new URLSearchParams(window.location.search).get("room_id")
}

export function ListenTogetherProvider() {
  const roomId = useListenTogetherStore((s) => s.roomId)

  useEffect(() => {
    const sync = () => {
      const param = getRoomParam()
      if (param) {
        useListenTogetherStore.getState().setRoomId(param)
      } else {
        useListenTogetherStore.getState().clear()
      }
    }
    sync()
    window.addEventListener("popstate", sync)
    return () => window.removeEventListener("popstate", sync)
  }, [])

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

    useListenTogetherStore.getState().setConnected(true)
    client.connect()

    const unsub = useAudioPlayerBase.subscribe((state, prev) => {
      if (client.syncing) return

      const store = useListenTogetherStore.getState()
      if (!store.roomId || !store.isHost || store.isEnded) return

      const trackId = state.queueTracks[state.queueIndex]?.id ?? null
      const prevTrackId = prev.queueTracks[prev.queueIndex]?.id ?? null
      const trackChanged = trackId !== prevTrackId
      const playbackChanged =
        state.requestedPlaybackState !== prev.requestedPlaybackState
      const seekChanged =
        state.requestedSeekPosition !== undefined &&
        state.requestedSeekPosition !== prev.requestedSeekPosition

      if (trackChanged && trackId) {
        console.log(
          `[listen-together] trackChanged: ${prevTrackId} -> ${trackId}, calling syncState`,
        )
        client.syncState(trackId)
        return
      }

      if (playbackChanged) {
        console.log(
          `[listen-together] playbackChanged: ${prev.requestedPlaybackState} -> ${state.requestedPlaybackState}, trackId=${trackId}`,
        )
        if (state.requestedPlaybackState === "playing" && trackId) {
          client.play(trackId)
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
      if (client.isHost()) {
        client.leave()
      }
      client.disconnect()
    }
  }, [roomId])

  return null
}
