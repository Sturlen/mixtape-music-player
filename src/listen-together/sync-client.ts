import PartySocket from "partysocket"
import type { PlayerAdapter } from "./player-adapter"
import type { PlayerSnapshot } from "./types"
import type { RoomState } from "./types"

export type ListenTogetherCallbacks = {
  onState?: (state: RoomState) => void
  onConnectionChange?: (connected: boolean) => void
  onError?: (message: string) => void
}

const IGNORE_DRIFT_MS = 150
const HARD_SEEK_DRIFT_MS = 500
const SEEK_COOLDOWN_MS = 2000
const DRIFT_INTERVAL_MS = 2000
const PING_INTERVAL_MS = 5000
const MAX_RTT_MS = 1000

export class ListenTogetherClient {
  syncing = false

  private partyHost: string
  private roomId: string
  private clientId: string
  private player: PlayerAdapter
  private callbacks: ListenTogetherCallbacks

  private socket: PartySocket | null = null
  private serverOffsetMs = 0
  private bestRttMs = Number.POSITIVE_INFINITY
  private lastHardSeekAtMs = 0
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
      this.socket?.send(
        JSON.stringify({
          type: "join",
          clientId: this.clientId,
          initialState: this.buildSnapshot(),
        }),
      )
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

  syncState(trackId: string): void {
    if (!this.socket || !this.isHost()) return
    const snapshot = this.player.getSnapshot()
    this.socket.send(
      JSON.stringify({
        type: "syncState",
        clientId: this.clientId,
        trackId,
        queue: snapshot.queue,
        queueIndex: snapshot.queueIndex,
        positionMs: 0,
        playbackState: snapshot.playbackState,
      }),
    )
  }

  leave(): void {
    if (!this.socket) return
    this.socket.send(
      JSON.stringify({ type: "leave", clientId: this.clientId }),
    )
  }

  play(trackId: string): void {
    if (!this.socket || !this.isHost()) return
    const snapshot = this.player.getSnapshot()
    this.socket.send(
      JSON.stringify({
        type: "play",
        clientId: this.clientId,
        trackId,
        queue: snapshot.queue,
        queueIndex: snapshot.queueIndex,
        positionMs: Math.round(snapshot.positionMs),
      }),
    )
  }

  pause(): void {
    if (!this.socket || !this.isHost()) return
    const snapshot = this.player.getSnapshot()
    this.socket.send(
      JSON.stringify({
        type: "pause",
        clientId: this.clientId,
        positionMs: Math.round(snapshot.positionMs),
      }),
    )
  }

  seek(positionMs: number): void {
    if (!this.socket || !this.isHost()) return
    this.socket.send(
      JSON.stringify({ type: "seek", clientId: this.clientId, positionMs }),
    )
  }

  // ── Server clock helpers ──────────────────────────────────────────

  private getEstimatedServerNowMs(): number {
    return Date.now() + this.serverOffsetMs
  }

  private getExpectedPositionMs(): number {
    const s = this.currentState
    if (!s) return 0
    if (s.playbackState === "paused") return s.positionMs
    const elapsedMs = this.getEstimatedServerNowMs() - s.positionCapturedAtMs
    return s.positionMs + elapsedMs * s.playbackRate
  }

  // ── Smooth ping/pong clock offset ─────────────────────────────────

  private updateServerOffsetFromPong(args: {
    sentAtMs: number
    receivedAtMs: number
    serverTimeMs: number
  }) {
    const rttMs = args.receivedAtMs - args.sentAtMs
    if (rttMs > MAX_RTT_MS) return

    const candidateOffsetMs =
      args.serverTimeMs + rttMs / 2 - args.receivedAtMs

    if (rttMs < this.bestRttMs) {
      this.bestRttMs = rttMs
      this.serverOffsetMs = candidateOffsetMs
      return
    }

    this.serverOffsetMs =
      this.serverOffsetMs * 0.9 + candidateOffsetMs * 0.1
  }

  // ── Outgoing host messages ────────────────────────────────────────

  private buildSnapshot(): PlayerSnapshot {
    return this.player.getSnapshot()
  }

  // ── Incoming message handling ─────────────────────────────────────

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
      case "syncState":
        this.applySyncState(msg)
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
    const { state } = msg as { state: RoomState }
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
    this.syncTo(state)
    this.syncing = false
    this.callbacks.onState?.(state)
  }

  private applyState(msg: unknown): void {
    const { state, executeAtMs } = msg as {
      state: RoomState
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
    this.syncTo(state, executeAtMs, false)
    this.syncing = false
    this.callbacks.onState?.(state)
  }

  private applySyncState(msg: unknown): void {
    const { state } = msg as { state: RoomState }

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
    this.syncTo(state, undefined, true)
    this.syncing = false
    this.callbacks.onState?.(state)
  }

  /**
   * Apply server state to the local player.
   *
   * When executeAtMs is provided, delay execution until estimated server
   * time reaches that value so all clients act at the same server timestamp.
   */
  private syncTo(
    state: RoomState,
    executeAtMs?: number,
    preservePlayback = false,
  ): void {
    const localSnapshot = this.player.getSnapshot()
    const needsQueueLoad =
      state.queue.length > 0 &&
      localSnapshot.queue[localSnapshot.queueIndex] !== state.trackId

    const apply = () => {
      const targetMs = Math.round(this.getExpectedPositionMs())
      this.player.seek(targetMs)

      if (!preservePlayback) {
        if (state.playbackState === "playing") {
          this.player.play()
        } else {
          this.player.pause()
        }
      }
    }

    if (executeAtMs !== undefined) {
      const delay = Math.max(0, executeAtMs - this.getEstimatedServerNowMs())
      if (needsQueueLoad && state.trackId) {
        this.player.loadQueue(state.queue, state.queueIndex)
      }
      setTimeout(apply, delay)
    } else {
      if (needsQueueLoad && state.trackId) {
        this.player.loadQueue(state.queue, state.queueIndex).then(apply)
      } else {
        apply()
      }
    }
  }

  // ── Clock sync via ping/pong ──────────────────────────────────────

  private handlePong(msg: unknown): void {
    const { serverTimeMs } = msg as { serverTimeMs: number }
    const receivedAtMs = Date.now()
    const sentAtMs =
      (msg as { clientTimeMs?: number }).clientTimeMs ?? receivedAtMs
    this.updateServerOffsetFromPong({ sentAtMs, receivedAtMs, serverTimeMs })
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
    }, PING_INTERVAL_MS)
  }

  // ── Drift correction ──────────────────────────────────────────────

  private startDriftCorrection(): void {
    this.driftInterval = setInterval(() => {
      if (!this.currentState) return
      if (this.isHostForState(this.currentState)) return
      if (this.isInSeekCooldown()) return

      const expectedMs = this.getExpectedPositionMs()
      const actualMs = this.player.getSnapshot().positionMs
      const driftMs = expectedMs - actualMs
      const absDrift = Math.abs(driftMs)

      if (absDrift >= HARD_SEEK_DRIFT_MS) {
        console.log(
          `[drift] hard seek: drift=${Math.round(driftMs)}ms ` +
            `expected=${Math.round(expectedMs)}ms actual=${Math.round(actualMs)}ms`,
        )
        this.syncing = true
        this.lastHardSeekAtMs = Date.now()
        this.player.seek(Math.round(expectedMs))
        this.syncing = false
      } else if (absDrift >= IGNORE_DRIFT_MS) {
        console.log(
          `[drift] ignoring: drift=${Math.round(driftMs)}ms ` +
            `expected=${Math.round(expectedMs)}ms actual=${Math.round(actualMs)}ms`,
        )
      }
    }, DRIFT_INTERVAL_MS)
  }

  private isInSeekCooldown(): boolean {
    return Date.now() - this.lastHardSeekAtMs < SEEK_COOLDOWN_MS
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private isHostForState(state: RoomState): boolean {
    return state.hostClientId === this.clientId
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
