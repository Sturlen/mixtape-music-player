import { create } from "zustand"

type ListenTogetherStore = {
  roomId: string | null
  isHost: boolean | null
  isEnded: boolean
  connected: boolean
  setRoomId: (id: string | null) => void
  setHost: (host: boolean | null) => void
  setEnded: (ended: boolean) => void
  setConnected: (connected: boolean) => void
  clear: () => void
}

export const useListenTogetherStore = create<ListenTogetherStore>((set) => ({
  roomId: null,
  isHost: null,
  isEnded: false,
  connected: false,
  setRoomId: (id) => set({ roomId: id }),
  setHost: (host) => set({ isHost: host }),
  setEnded: (ended) => set({ isEnded: ended }),
  setConnected: (connected) => set({ connected }),
  clear: () =>
    set({ roomId: null, isHost: null, isEnded: false, connected: false }),
}))
