# Mixtape — Roadmap

Status prefixes: `[-]` = active / in progress  `[x]` = done  `[~]` = abandoned  `[ ]` = todo

---

## Active Now

- [ ] **Multi-artist tracks** — See [plan below](#multi-artist-track-support)

---

## User-Facing Features

### Must-Have for v1.0

- [ ] **Multi-artist tracks** — compilation albums, "feat." collaborators in track rows, artist "Appearances" section. See detailed plan below.
- [ ] **Image compression** — server resizes cover/artist art on the fly (client already sends `?w=` params)
- [ ] **User-facing updates** — mechanism to notify users when a new version is available (in-app banner, release API, or similar)
- [ ] **Radio Mode** — frontend mode that appends songs/albums to the queue instead of replacing them. No interrupting the current song.

### Should-Have

- [ ] **Custom cassette skins** — user-selectable cassette shell colors/materials

### Done

- [x] **Library scanning & metadata enrichment** — background concurrency, ffprobe/mediabunny
- [x] **Artist/album/track browsing + search** — Fuse.js fuzzy search
- [x] **Audio playback** — HTTP range requests via `Bun.file()`
- [x] **Queue management** — shuffle, play/pause/skip/seek via Zustand
- [x] **Playlist CRUD** — create/edit/delete, add/remove tracks
- [x] **Multi-user auth** — JWT, admin setup, invitation system
- [x] **Listen Together** — PartyKit room server, host/follower state sync (no music streaming)
- [x] **Mobile UI** — drawer controls, swipe
- [x] **Dominant color extraction** — colorthief MMCQ
- [x] **Persistent database** — PGlite, survives restarts
- [x] **Docker image** — s6-overlay based
- [x] **AAC pre-encoding** — instant playback via lightweight streams

### Abandoned

- [~] **HLS streaming with pre-generated segment 0** — independent FFmpeg invocations cause AAC encoder state resets at segment boundaries. Audible hitches persist even with identical encoder params. Fix requires single continuous FFmpeg pass (high CPU at reload). AAC pre-encoding supersedes this. See `docs/HLS-HITCH-ANALYSIS.md`.

---

## Multi-Artist Track Support

Add support for compilation albums and collaborative tracks via a `track_artists` junction table.

### Schema

- [ ] **1a.** Add `track_artists` table to `src/db/schema.ts`
  - Columns: `id`, `trackId` (FK→tracks), `artistId` (FK→artists), `role` (text, default "primary"), `position` (int)
  - Indexes: `(trackId)`, `(artistId)`, unique `(trackId, artistId, role)`
  - `albums.artistId` stays NOT NULL — compilations use "Various Artists" Artist
- [ ] **1b.** Generate & apply migration: `bun run db:generate && bun run db:up`

### Types

- [ ] **2a.** Add `TrackArtist` type (`id`, `name`, `role`) to `src/lib/types.ts`
- [ ] **2b.** Add `artists?: TrackArtist[]` to `Track` type

### Scanner / Library

- [ ] **3a.** Add `parseArtistNames(tag)` helper — splits on `,`, `&`, `feat.`, `ft.`, `featuring`, `/`, `;`
- [ ] **3b.** Add `upsertTrackArtists(trackId, entries[])` method — deletes stale entries, inserts fresh ones
- [ ] **3c.** Update `addFromMetadata()` — parse `artistName` tag into multiple artists, call `upsertTrackArtists`
- [ ] **3d.** Track stableId — change to use `filePath` instead of `artistName/albumName/title` (more stable)
- [ ] **3e.** Backfill existing tracks — populate `track_artists` with single "primary" entry

### Library Query Methods

- [ ] **4a.** `getTrackArtists(trackId)` — JOIN artists + track_artists, ordered by position
- [ ] **4b.** `getTrackArtistsBatch(trackIds)` — batch version for N+1 prevention
- [ ] **4c.** `getArtistAppearances(artistId)` — albums where artist contributed via track_artists but is not album artist

### API Endpoints

- [ ] **5a.** `GET /api/albums/:albumId` — include `artists` on each track (batch-load)
- [ ] **5b.** `GET /api/artists/:artistId` — add `appearances` array (compilations featuring this artist)
- [ ] **5c.** `GET /api/tracks` and `GET /api/tracks/:trackId` — include artists
- [ ] **5d.** `POST /api/playAlbum/:albumId` — include artists on tracks
- [ ] **5e.** `POST /api/player` — include artists in response

### Search

- [ ] **6a.** Update `buildIndex()` — join all track artist names into `artistName` field for Fuse
- [ ] **6b.** Add `artistName` key to `fuse_tracks` config in `src/lib/fuse.ts`

### Frontend — TrackRow

- [ ] **7a.** Add `artists?: { name: string; role: string }[]` to `TrackData` interface
- [ ] **7b.** Render artist subtitle when track artists differ from album artist

### Frontend — Player

- [ ] **8a.** Add `artists` field to Player `Track` type (`src/Player.tsx`)
- [ ] **8b.** `src/lib/api.ts` — map `track.artists` from API into player tracks
- [ ] **8c.** `src/QueueList.tsx` — show artist name next to track name
- [ ] **8d.** `src/client/components/PlaybackDetails.tsx` — show artist name under track title

### Frontend — Pages

- [ ] **9a.** `src/routes/albums/$id.tsx` — pass `track.artists` through to `TrackRow`
- [ ] **9b.** `src/routes/artists/$id.tsx` — add "Appearances" grid section for compilation albums

### Verify

- [ ] **10a.** `bun run check` — pass lint + typecheck
- [ ] **10b.** Manual test: scan a "Various Artists" directory, verify tracks show per-artist names
- [ ] **10c.** Manual test: scan a directory with "feat." tags, verify featured artists appear
- [ ] **10d.** Search for a featured artist — verify their collaborative tracks appear in results
- [ ] **10e.** Artist page — verify "Appearances" section shows compilation albums

---

## Project Management & Workflow

### App Testability Refactoring

Extract app factory from module-level side effects so routes can be tested in isolation.

- [ ] **1.** Extract `db` object into a factory parameter — move `db` definition from `src/index.tsx` into a `createApp({ db })` function
- [ ] **2.** Extract Fuse instances into factory parameters — move from `src/lib/fuse.ts` into the factory as `{ fuseInstances }`
- [ ] **3.** Create `createApp()` factory — wraps Elysia app definition, accepts `{ db, fuseInstances, sources, env }`, returns app without `.listen()`
- [ ] **4.** Remove `await reloadLibrary()` from module scope — move into a separate entry point (`src/server.tsx`) that calls `createApp()`, then `reloadLibrary()`, then `.listen()`
- [ ] **5.** Remove `.listen()` from module scope — keep `src/index.tsx` as a pure app definition export
- [ ] **6.** Make `reloadLibrary()` injectable — pass as parameter so tests can mock it
- [ ] **7.** Make `parse()` and `loadPlaylists()` injectable — allow mock implementations in tests
- [ ] **8.** Export `createApp` and types from `src/index.tsx` for test imports
- [ ] **9.** Create test utility to build mock app — use `createApp()` with in-memory Maps and empty Fuse instances

Target structure:
```
src/
├── index.tsx        # Export createApp(), types — no side effects
├── server.tsx       # Entry point: calls createApp(), reloadLibrary(), listen()
├── lib/
│   └── fuse.ts      # Keep as-is or export factory function
```

### Integration Tests

In-memory app instances with mock data for each endpoint. Requires app testability refactoring first.

- [ ] **Stats:** `GET /api/stats` returns correct counts
- [ ] **Artists:** list, search, by-id, unknown
- [ ] **Albums:** list, search, by-id (with sorted tracks), unknown
- [ ] **Tracks:** list, by-id, unknown
- [ ] **Playlists:** list, search, by-id, unknown, CRUD (create/update/delete), disable-guard
- [ ] **Player:** `POST /api/player` (valid/missing/unknown trackId), `playAlbum`, `playPlaylist`
- [ ] **Files:** album art, artist art (success + 404)
- [ ] **Library:** reload endpoint

### Unit Tests

- [ ] **Utilities** — `cn()`, `raise()`
- [ ] **Math** — `clamp()`
- [ ] **Track sorting** — `compareTracksByNumberName()`
- [ ] **Player logic** — shuffle, next song, queue behavior when track deleted

### Documentation & Process

- [ ] **Dead-ends convention** — `docs/dead-ends/<topic>.md` with problem, what was tried, why it failed, measurements. Reference from active plans so future work doesn't retread. Keep it lightweight — only create a file when the investigation was significant enough to warrant one.
- [ ] **Release process** — semver tags, GitHub Releases, Docker image tags. CHANGELOG.md stays as release history (date stamps are fine for a solo project — convert to semver at release time).
- [ ] **Production hardening** — auto-restart, signal handling, bare-metal startup docs (s6 covers Docker)
- [ ] **Stable API contract** — once v1.0 is near, version the API path (`/api/v1/...`) or declare stability guarantees
