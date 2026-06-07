import type * as Party from "partykit/server"

type PlaybackState = "playing" | "paused"

type PlayerSnapshot = {
  trackId: string | null
  queue: string[]
  queueIndex: number
  playbackState: PlaybackState
  positionMs: number
}

type RoomState = {
  version: number
  hostClientId: string | null
  trackId: string | null
  queue: string[]
  queueIndex: number
  playbackState: PlaybackState
  positionMs: number
  positionCapturedAtMs: number
  playbackRate: number
  ended: boolean
}

type ClientMessage =
  | { type: "join"; clientId: string; initialState?: PlayerSnapshot }
  | {
      type: "syncState"
      clientId: string
      trackId: string
      queue: string[]
      queueIndex: number
      positionMs: number
      playbackState: PlaybackState
    }
  | {
      type: "play"
      clientId: string
      trackId: string
      queue: string[]
      queueIndex: number
      positionMs: number
    }
  | { type: "pause"; clientId: string; positionMs: number }
  | { type: "seek"; clientId: string; positionMs: number }
  | { type: "leave"; clientId: string }
  | { type: "ping"; clientTimeMs: number }

type ServerMessage =
  | { type: "snapshot"; state: RoomState; serverTimeMs: number }
  | {
      type: "state"
      state: RoomState
      serverTimeMs: number
      executeAtMs?: number
    }
  | { type: "syncState"; state: RoomState; serverTimeMs: number }
  | { type: "pong"; serverTimeMs: number }
  | { type: "error"; message: string }

const defaultState = (): RoomState => ({
  version: 0,
  hostClientId: null,
  trackId: null,
  queue: [],
  queueIndex: 0,
  playbackState: "paused",
  positionMs: 0,
  positionCapturedAtMs: Date.now(),
  playbackRate: 1,
  ended: false,
})

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
      console.log(
        `[${this.room.id}] onStart: restored state v${this.state.version} host=${this.state.hostClientId} track=${this.state.trackId} ended=${this.state.ended}`,
      )
    } else {
      console.log(`[${this.room.id}] onStart: fresh room`)
    }
  }

  async onConnect(connection: Party.Connection) {
    const now = Date.now()
    console.log(
      `[${this.room.id}] onConnect: connection=${connection.id} host=${this.state.hostClientId} track=${this.state.trackId} v${this.state.version}`,
    )
    if (this.state.hostClientId !== null) {
      connection.send(
        JSON.stringify({
          type: "snapshot",
          state: this.state,
          serverTimeMs: now,
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
        const clientId = msg.clientId
        console.log(
          `[${this.room.id}] join: connection=${id} clientId=${clientId} host=${this.state.hostClientId} hasInitial=${!!msg.initialState}`,
        )
        this.connectionToClientId.set(id, clientId)
        if (
          this.state.hostClientId === null ||
          this.state.hostClientId === clientId
        ) {
          this.state.hostClientId = clientId
          if (msg.initialState) {
            this.state.trackId = msg.initialState.trackId
            this.state.queue = msg.initialState.queue
            this.state.queueIndex = msg.initialState.queueIndex
            this.state.playbackState = msg.initialState.playbackState
            this.state.positionMs = msg.initialState.positionMs
            this.state.positionCapturedAtMs = now
          }
          this.state.ended = false
          this.state.version++
          console.log(
            `[${this.room.id}] host=${clientId} track=${this.state.trackId} queueLen=${this.state.queue.length} state=${this.state.playbackState} pos=${this.state.positionMs} v${this.state.version}`,
          )
          await this.persist()
          this.broadcastState(now)
        } else {
          console.log(`[${this.room.id}] follower joined: clientId=${clientId}`)
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

      case "syncState": {
        const clientId = this.connectionToClientId.get(id)
        if (!clientId || clientId !== this.state.hostClientId) {
          sender.send(
            JSON.stringify({
              type: "error",
              message: "Only the host can sync state",
            } satisfies ServerMessage),
          )
          return
        }
        console.log(
          `[${this.room.id}] syncState: track=${msg.trackId} queueLen=${msg.queue.length} index=${msg.queueIndex} state=${msg.playbackState} pos=${msg.positionMs}`,
        )
        this.state.trackId = msg.trackId
        this.state.queue = msg.queue
        this.state.queueIndex = msg.queueIndex
        this.state.positionMs = msg.positionMs
        this.state.positionCapturedAtMs = now
        this.state.playbackState = msg.playbackState
        this.state.ended = false
        this.state.version++
        await this.persist()
        this.broadcastSyncState(now)
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
        console.log(
          `[${this.room.id}] play: track=${msg.trackId} queueLen=${msg.queue.length} index=${msg.queueIndex} pos=${msg.positionMs}`,
        )
        this.state.trackId = msg.trackId
        this.state.queue = msg.queue
        this.state.queueIndex = msg.queueIndex
        this.state.positionMs = msg.positionMs
        this.state.positionCapturedAtMs = now
        this.state.playbackState = "playing"
        this.state.ended = false
        this.state.version++
        await this.persist()
        this.broadcastState(now, now + 800)
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
        console.log(`[${this.room.id}] pause: pos=${msg.positionMs}`)
        this.state.positionMs = msg.positionMs
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
        console.log(`[${this.room.id}] seek: pos=${msg.positionMs}`)
        this.state.positionMs = msg.positionMs
        this.state.positionCapturedAtMs = now
        this.state.version++
        await this.persist()
        this.broadcastState(now)
        break
      }

      case "leave": {
        const clientId = this.connectionToClientId.get(id)
        if (!clientId || clientId !== this.state.hostClientId) {
          sender.send(
            JSON.stringify({
              type: "error",
              message: "Only the host can end the session",
            } satisfies ServerMessage),
          )
          return
        }
        console.log(`[${this.room.id}] leave: host ${clientId} ended session`)
        this.state.ended = true
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
    console.log(
      `[${this.room.id}] onClose: connection=${connection.id} clientId=${clientId ?? "unknown"}`,
    )
    this.connectionToClientId.delete(connection.id)
  }

  private async persist() {
    await this.room.storage.put("state", this.state)
  }

  private broadcastState(now: number, executeAtMs?: number) {
    console.log(
      `[${this.room.id}] broadcast: v${this.state.version} track=${this.state.trackId} state=${this.state.playbackState} pos=${this.state.positionMs} ended=${this.state.ended} executeAt=${executeAtMs ?? "none"}`,
    )
    const msg: ServerMessage = {
      type: "state",
      state: this.state,
      serverTimeMs: now,
    }
    if (executeAtMs !== undefined) {
      msg.executeAtMs = executeAtMs
    }
    this.room.broadcast(JSON.stringify(msg))
  }

  private broadcastSyncState(now: number) {
    console.log(
      `[${this.room.id}] broadcastSyncState: v${this.state.version} track=${this.state.trackId} state=${this.state.playbackState} pos=${this.state.positionMs} ended=${this.state.ended}`,
    )
    const msg: ServerMessage = {
      type: "syncState",
      state: this.state,
      serverTimeMs: now,
    }
    this.room.broadcast(JSON.stringify(msg))
  }
}
