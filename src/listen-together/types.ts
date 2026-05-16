export type TrackRef = {
  trackId: string
  durationMs: number
}

export type PlaybackState = "playing" | "paused"

export type PlayerSnapshot = {
  track?: TrackRef
  queue: TrackRef[]
  queueIndex: number
  playbackState: PlaybackState
  positionMs: number
}

export type RoomState = {
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

export type ClientMessage =
  | { type: "join"; clientId: string; initialState?: PlayerSnapshot }
  | { type: "play"; clientId: string; track?: TrackRef; queue?: TrackRef[]; queueIndex?: number; positionMs?: number }
  | { type: "pause"; clientId: string }
  | { type: "seek"; clientId: string; positionMs: number }
  | { type: "ping"; clientTimeMs: number }

export type ServerMessage =
  | { type: "snapshot"; state: RoomState; serverTimeMs: number }
  | {
      type: "state"
      state: RoomState
      serverTimeMs: number
      executeAtMs?: number
    }
  | { type: "pong"; serverTimeMs: number }
  | { type: "error"; message: string }
