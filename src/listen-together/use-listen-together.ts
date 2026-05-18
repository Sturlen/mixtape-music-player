import { useEffect } from "react"
import { useListenTogetherStore } from "./store"

export type UseListenTogetherReturn = {
  connected: boolean
  isHost: boolean | null
  isEnded: boolean
  roomId: string | null
  disconnect: () => void
}

function getRoomParam(): string | null {
  return new URLSearchParams(window.location.search).get("room_id")
}

export function useListenTogether(): UseListenTogetherReturn {
  const connected = useListenTogetherStore((s) => s.connected)
  const isHost = useListenTogetherStore((s) => s.isHost)
  const isEnded = useListenTogetherStore((s) => s.isEnded)
  const roomId = useListenTogetherStore((s) => s.roomId)

  useEffect(() => {
    const param = getRoomParam()
    useListenTogetherStore.getState().setRoomId(param)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const param = getRoomParam()
      useListenTogetherStore.getState().setRoomId(param)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const disconnect = () => {
    useListenTogetherStore.getState().clear()
  }

  return { connected, isHost, isEnded, roomId, disconnect }
}
