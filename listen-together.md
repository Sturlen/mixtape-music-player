# Listen Together — MVP

Best-effort synchronized listening via PartyKit.

## Architecture

```
┌─────────────┐       PartyKit        ┌─────────────┐
│  Browser A  │◄───── WebSocket ─────►│  Browser B  │
│  (host)     │                       │  (follower) │
│             │  sync: track/pos/     │             │
│  player ◄───┤  play/pause/seek     ├──► player   │
└─────────────┘                       └─────────────┘
```

- No custom backend — PartyKit is the only server-side component.
- Each client plays audio independently using `trackId`.
- PartyKit room is only for realtime state sync.

## Files

| File | Purpose |
|------|---------|
| `party/index.ts` | PartyKit room server — authoritative state, host detection, broadcast |
| `partykit.json` | PartyKit project config |
| `src/listen-together/types.ts` | Shared types (`RoomState`, messages) |
| `src/listen-together/room-id.ts` | `getOrCreateClientId()` + `createRoomId()` |
| `src/listen-together/player-adapter.ts` | Wraps Zustand player into `PlayerAdapter` |
| `src/listen-together/sync-client.ts` | `ListenTogetherClient` — PartySocket, clock sync, state application |
| `src/listen-together/use-listen-together.ts` | React hook wrapping client + adapter |
| `src/listen-together/store.ts` | Zustand store for session state (shared across components) |
| `src/routes/listen/index.tsx` | `/listen` — create or join a session |
| `src/routes/listen/$roomId.tsx` | `/listen/:roomId` — active session UI |

## How to Run Locally

### 1. Start PartyKit dev server

```bash
bunx partykit dev
```

This runs the room server at `localhost:1999`.

### 2. Start the mixtape app

In another terminal:

```bash
bun dev
```

The default `PARTYKIT_HOST` is already `localhost:1999` (set in `src/shared/env.ts`).

### 3. Open two browser windows

1. Navigate to `http://localhost:3000/listen` in Browser A
2. Click **Create Session**
3. Copy the room link
4. Open the same link in Browser B (or a private window)

Browser A becomes host, Browser B joins as follower.

### 4. Test the MVP

- **Play a track:** Host picks a track from the library, host presses play. Follower starts playing the same track within ~1s.
- **Pause:** Host pauses. Follower pauses at the same position.
- **Seek:** Host seeks. Follower jumps to the new position.
- **Late join:** Open the link in a third window — it syncs immediately from current state.
- **Host disconnect:** Close the host's window. Follower sees "Session ended" and controls are disabled.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BUN_PUBLIC_PARTYKIT_HOST` | `localhost:1999` | PartyKit server address (must be prefixed `BUN_PUBLIC_` for frontend access) |

## Deployment

### 1. Deploy PartyKit room

```bash
# Login (one-time)
bunx partykit login

# Deploy
bunx partykit deploy
```

You'll get a production URL like `https://mixtape-listen-together.<username>.partykit.dev`.

### 2. Point the app to production

Set `BUN_PUBLIC_PARTYKIT_HOST` to the deployment URL:

```bash
BUN_PUBLIC_PARTYKIT_HOST=mixtape-listen-together.<username>.partykit.dev bun dev
```

Or in production:

```bash
BUN_PUBLIC_PARTYKIT_HOST=mixtape-listen-together.<username>.partykit.dev bun run start
```

### 3. Update env.ts

For production builds, change the default in `src/shared/env.ts`:

```ts
BUN_PUBLIC_PARTYKIT_HOST: z.string().default("mixtape-listen-together.<username>.partykit.dev"),
```

## Acceptance Criteria

1. Opening `/listen/<roomId>` in browser A creates a room
2. Browser A becomes host
3. Opening same URL in browser B joins as follower
4. When host presses play on a track:
   - follower loads same track
   - follower starts within roughly 1 second
5. When host pauses: follower pauses near same position
6. When host seeks: follower jumps to new position
7. Refreshing follower resyncs correctly from current host state
8. If host disconnects: room state becomes `ended`, follower cannot control
9. No custom backend required

## Known Limitations (MVP)

- No queue support — only a single track
- No host handoff — if host disconnects, session is done
- No perfect sync — drift under 250ms is accepted
- No auth or room privacy
- Same `trackId` must resolve to the same audio on all clients
- No recovery from host disconnect
