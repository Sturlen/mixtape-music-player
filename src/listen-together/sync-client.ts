import PartySocket from "partysocket"
import type { PlayerAdapter } from "./player-adapter"
import type { RoomState, TrackRef } from "./types"

export type ListenTogetherCallbacks = {
  onState?: (state: RoomState) => void
  onConnectionChange?: (connected: boolean) => void
  onError?: (message: string) => void
}

export class ListenTogetherClient {
  syncing = false

  private partyHost: string
  private roomId: string
  private clientId: string
  private player: PlayerAdapter
  private callbacks: ListenTogetherCallbacks

  private socket: PartySocket | null = null
  private serverOffsetMs = 0
  private lastAppliedVersion = -1
  private currentState: RoomState | null = null
  private connected = false
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private driftInterval: ReturnType<typeof setInterval> | null = null

  constructor(args: {
    partyHost: string
    roomId: string
    clientId: string
    player: PlayerAdapter
    callbacks?: ListenTogetherCallbacks
  }) {
    this.partyHost = args.partyHost
    this.roomId = args.roomId
    this.clientId = args.clientId
    this.player = args.player
    this.callbacks = args.callbacks ?? {}
  }

  connect(): void {
    if (this.socket) return

    this.socket = new PartySocket({
      host: this.partyHost,
      room: this.roomId,
      id: this.clientId,
    })

    this.socket.onopen = () => {
      this.connected = true
      this.callbacks.onConnectionChange?.(true)
      this.socket?.send(JSON.stringify({ type: "join", clientId: this.clientId }))
      this.startPingInterval()
      this.startDriftCorrection()
    }

    this.socket.onclose = () => {
      this.connected = false
      this.callbacks.onConnectionChange?.(false)
      this.stopIntervals()
    }

    this.socket.onerror = () => {
      this.connected = false
      this.callbacks.onConnectionChange?.(false)
    }

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string)
        this.handleMessage(msg)
      } catch {
        // ignore malformed messages
      }
    }
  }

  disconnect(): void {
    this.stopIntervals()
    this.socket?.close()
    this.socket = null
    this.connected = false
  }

  getState(): RoomState | null {
    return this.currentState
  }

  isHost(): boolean {
    return this.currentState?.hostClientId === this.clientId
  }

  isEnded(): boolean {
    return this.currentState?.ended === true
  }

  play(track?: TrackRef): void {
    if (!this.socket || !this.isHost() || this.isEnded()) return
    this.socket.send(
      JSON.stringify({
        type: "play",
        clientId: this.clientId,
        ...(track ? { track } : {}),
      }),
    )
  }

  pause(): void {
    if (!this.socket || !this.isHost() || this.isEnded()) return
    this.socket.send(
      JSON.stringify({ type: "pause", clientId: this.clientId }),
    )
  }

  seek(positionMs: number): void {
    if (!this.socket || !this.isHost() || this.isEnded()) return
    this.socket.send(
      JSON.stringify({ type: "seek", clientId: this.clientId, positionMs }),
    )
  }

  private handleMessage(msg: unknown): void {
    if (typeof msg !== "object" || !msg || !("type" in msg)) return
    const typed = msg as { type: string }

    switch (typed.type) {
      case "snapshot":
        this.applySnapshot(msg)
        break
      case "state":
        this.applyState(msg)
        break
      case "pong":
        this.handlePong(msg)
        break
      case "error":
        this.callbacks.onError?.(
          ((msg as Record<string, unknown>).message as string) ?? "Unknown error",
        )
        break
    }
  }

  private applySnapshot(msg: unknown): void {
    const { state, serverTimeMs } = msg as {
      state: RoomState
      serverTimeMs: number
    }
    this.currentState = state
    this.lastAppliedVersion = state.version

    if (this.isHostForState(state)) {
      this.callbacks.onState?.(state)
      return
    }

    if (state.ended) {
      this.syncing = true
      this.player.pause()
      this.syncing = false
      return
    }

    this.syncing = true
    this.syncToState(state, serverTimeMs, undefined)
    this.syncing = false
    this.callbacks.onState?.(state)
  }

  private applyState(msg: unknown): void {
    const { state, serverTimeMs, executeAtMs } = msg as {
      state: RoomState
      serverTimeMs: number
      executeAtMs?: number
    }

    if (state.version < this.lastAppliedVersion) return
    this.lastAppliedVersion = state.version
    this.currentState = state

    if (this.isHostForState(state)) {
      this.callbacks.onState?.(state)
      return
    }

    if (state.ended) {
      this.syncing = true
      this.player.pause()
      this.syncing = false
      this.callbacks.onState?.(state)
      return
    }

    this.syncing = true
    this.syncToState(state, serverTimeMs, executeAtMs)
    this.syncing = false
    this.callbacks.onState?.(state)
  }

  private syncToState(
    state: RoomState,
    serverTimeMs: number,
    executeAtMs: number | undefined,
  ): void {
    const serverNow = this.getEstimatedServerNow()
    const trackChanged =
      state.track &&
      this.player.getSnapshot().track?.trackId !== state.track.trackId

    const apply = () => {
      const serverNow = this.getEstimatedServerNow()
      const targetPositionMs =
        state.playbackState === "playing"
          ? state.positionMs +
            (serverNow - state.positionCapturedAtMs) * state.playbackRate
          : state.positionMs

      if (state.playbackState === "playing") {
        this.player.seek(Math.round(targetPositionMs))
        this.player.play()
      } else {
        this.player.seek(Math.round(targetPositionMs))
        this.player.pause()
      }
    }

    if (executeAtMs !== undefined) {
      const delay = Math.max(0, executeAtMs - this.getEstimatedServerNow())
      if (state.track && trackChanged) {
        this.player.loadTrack(state.track)
      }
      setTimeout(apply, delay)
    } else {
      if (state.track && trackChanged) {
        this.player.loadTrack(state.track).then(apply)
      } else {
        apply()
      }
    }
  }

  private isHostForState(state: RoomState): boolean {
    return state.hostClientId === this.clientId
  }

  private handlePong(msg: unknown): void {
    const { serverTimeMs } = msg as { serverTimeMs: number }
    const receivedAt = Date.now()
    const sentAt = (msg as { clientTimeMs?: number }).clientTimeMs ?? receivedAt
    const rtt = receivedAt - sentAt
    const estimatedServerNow = serverTimeMs + rtt / 2
    this.serverOffsetMs = estimatedServerNow - receivedAt
  }

  private getEstimatedServerNow(): number {
    return Date.now() + this.serverOffsetMs
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({
            type: "ping",
            clientTimeMs: Date.now(),
          }),
        )
      }
    }, 10000)
  }

  private startDriftCorrection(): void {
    this.driftInterval = setInterval(() => {
      if (!this.currentState || this.currentState.playbackState !== "playing") return
      if (this.isHostForState(this.currentState)) return

      const serverNow = this.getEstimatedServerNow()
      const expectedMs =
        this.currentState.positionMs +
        (serverNow - this.currentState.positionCapturedAtMs) *
          this.currentState.playbackRate

      const actualMs = this.player.getSnapshot().positionMs
      const drift = Math.abs(expectedMs - actualMs)

      if (drift >= 250) {
        this.syncing = true
        this.player.seek(Math.round(expectedMs))
        this.syncing = false
      }
    }, 5000)
  }

  private stopIntervals(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    if (this.driftInterval) {
      clearInterval(this.driftInterval)
      this.driftInterval = null
    }
  }
}
