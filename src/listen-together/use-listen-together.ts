import { useEffect } from "react"
import { useListenTogetherStore } from "./store"

export type UseListenTogetherReturn = {
  connected: boolean
  isHost: boolean | null
  isEnded: boolean
  disconnect: () => void
}

export function useListenTogether(roomId: string | undefined): UseListenTogetherReturn {
  const connected = useListenTogetherStore((s) => s.connected)
  const isHost = useListenTogetherStore((s) => s.isHost)
  const isEnded = useListenTogetherStore((s) => s.isEnded)

  useEffect(() => {
    if (roomId) {
      useListenTogetherStore.getState().setRoomId(roomId)
    }
  }, [roomId])

  const disconnect = () => {
    useListenTogetherStore.getState().clear()
  }

  return { connected, isHost, isEnded, disconnect }
}
