import type * as Party from "partykit/server"

type TrackRef = {
  trackId: string
  durationMs: number
}

type PlaybackState = "playing" | "paused"

type PlayerSnapshot = {
  track?: TrackRef
  queue: TrackRef[]
  queueIndex: number
  playbackState: PlaybackState
  positionMs: number
}

type RoomState = {
  version: number
  hostClientId: string | null
  track: TrackRef | null
  queue: TrackRef[]
  queueIndex: number
  playbackState: PlaybackState
  positionMs: number
  positionCapturedAtMs: number
  playbackRate: number
  ended: boolean
}

type ClientMessage =
  | { type: "join"; clientId: string; initialState?: PlayerSnapshot }
  | { type: "play"; clientId: string; track?: TrackRef; queue?: TrackRef[]; queueIndex?: number; positionMs?: number }
  | { type: "pause"; clientId: string }
  | { type: "seek"; clientId: string; positionMs: number }
  | { type: "ping"; clientTimeMs: number }

type ServerMessage =
  | { type: "snapshot"; state: RoomState; serverTimeMs: number }
  | {
      type: "state"
      state: RoomState
      serverTimeMs: number
      executeAtMs?: number
    }
  | { type: "pong"; serverTimeMs: number }
  | { type: "error"; message: string }

const defaultState = (): RoomState => ({
  version: 0,
  hostClientId: null,
  track: null,
  queue: [],
  queueIndex: 0,
  playbackState: "paused",
  positionMs: 0,
  positionCapturedAtMs: Date.now(),
  playbackRate: 1,
  ended: false,
})

function getCurrentPositionMs(state: RoomState, now: number): number {
  if (state.playbackState !== "playing") return state.positionMs
  return Math.max(
    0,
    state.positionMs +
      (now - state.positionCapturedAtMs) * state.playbackRate,
  )
}

export default class RoomServer implements Party.PartyServer {
  state: RoomState
  connectionToClientId = new Map<string, string>()

  constructor(readonly room: Party.Party) {
    this.state = defaultState()
  }

  async onStart() {
    const persisted = await this.room.storage.get<RoomState>("state")
    if (persisted) {
      this.state = persisted
    }
  }

  async onConnect(connection: Party.Connection) {
    if (this.state.hostClientId !== null) {
      connection.send(
        JSON.stringify({
          type: "snapshot",
          state: this.state,
          serverTimeMs: Date.now(),
        } satisfies ServerMessage),
      )
    }
  }

  async onMessage(raw: string, sender: Party.Connection) {
    let msg: ClientMessage
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    const now = Date.now()
    const id = sender.id

    switch (msg.type) {
      case "join": {
        this.connectionToClientId.set(id, msg.clientId)
        if (this.state.hostClientId === null || this.state.hostClientId === msg.clientId) {
          this.state.hostClientId = msg.clientId
          if (msg.initialState) {
            this.state.track = msg.initialState.track ?? null
            this.state.queue = msg.initialState.queue
            this.state.queueIndex = msg.initialState.queueIndex
            this.state.playbackState = msg.initialState.playbackState
            this.state.positionMs = msg.initialState.positionMs
            this.state.positionCapturedAtMs = now
          }
          await this.persistAndBroadcast(now)
        }
        sender.send(
          JSON.stringify({
            type: "snapshot",
            state: this.state,
            serverTimeMs: now,
          } satisfies ServerMessage),
        )
        break
      }

      case "play": {
        const clientId = this.connectionToClientId.get(id)
        if (!clientId || clientId !== this.state.hostClientId) {
          sender.send(
            JSON.stringify({
              type: "error",
              message: "Only the host can play",
            } satisfies ServerMessage),
          )
          return
        }
        if (msg.track) {
          this.state.track = msg.track
          this.state.positionMs = msg.positionMs ?? 0
        }
        if (msg.queue) {
          this.state.queue = msg.queue
        }
        if (msg.queueIndex !== undefined) {
          this.state.queueIndex = msg.queueIndex
        }
        this.state.playbackState = "playing"
        this.state.positionCapturedAtMs = now
        this.state.ended = false
        this.state.version++
        await this.persist()
        this.broadcastState(now + 800)
        break
      }

      case "pause": {
        const clientId = this.connectionToClientId.get(id)
        if (!clientId || clientId !== this.state.hostClientId) {
          sender.send(
            JSON.stringify({
              type: "error",
              message: "Only the host can pause",
            } satisfies ServerMessage),
          )
          return
        }
        this.state.positionMs = getCurrentPositionMs(this.state, now)
        this.state.playbackState = "paused"
        this.state.positionCapturedAtMs = now
        this.state.version++
        await this.persist()
        this.broadcastState(now)
        break
      }

      case "seek": {
        const clientId = this.connectionToClientId.get(id)
        if (!clientId || clientId !== this.state.hostClientId) {
          sender.send(
            JSON.stringify({
              type: "error",
              message: "Only the host can seek",
            } satisfies ServerMessage),
          )
          return
        }
        this.state.positionMs = msg.positionMs
        this.state.positionCapturedAtMs = now
        this.state.version++
        await this.persist()
        this.broadcastState(now)
        break
      }

      case "ping": {
        sender.send(
          JSON.stringify({
            type: "pong",
            serverTimeMs: now,
          } satisfies ServerMessage),
        )
        break
      }
    }
  }

  async onClose(connection: Party.Connection) {
    const clientId = this.connectionToClientId.get(connection.id)
    if (clientId && clientId === this.state.hostClientId) {
      this.state.ended = true
      this.state.version++
      await this.persist()
      this.broadcastState(Date.now())
    }
    this.connectionToClientId.delete(connection.id)
  }

  private async persist() {
    await this.room.storage.put("state", this.state)
  }

  private async persistAndBroadcast(now: number) {
    await this.persist()
    this.broadcastState(now)
  }

  private broadcastState(executeAtMs?: number) {
    const msg: ServerMessage = {
      type: "state",
      state: this.state,
      serverTimeMs: Date.now(),
    }
    if (executeAtMs !== undefined) {
      msg.executeAtMs = executeAtMs
    }
    this.room.broadcast(JSON.stringify(msg))
  }
}
