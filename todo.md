# Mixtape — Roadmap

Status prefixes: `[-]` = active / in progress  `[x]` = done  `[~]` = abandoned  `[ ]` = todo

---

## Active Now

- [ ] **Multi-artist tracks** — See [plan below](#multi-artist-track-support)

---

## Bugs

- [ ] **MediaSession dies after pressing skip on lock screen** — pressing next/prev on the lock screen causes MediaSession controls to disappear. Likely related to the track loading gap where playback state briefly goes to "paused" or `setPositionState` gets called with invalid values during the transition.
- [ ] **Album layout cannot handle very long filenames** — track names that are very long (no spaces, >30 chars) cause the album page layout to break. Track row text overflows or pushes other elements out.

---

## User-Facing Features

### Must-Have for v1.0

These features involve schema changes or API response shape changes. Must land before the stable release tag.

- [ ] **Multi-artist tracks** — compilation albums, "feat." collaborators in track rows, artist "Appearances" section. See detailed plan below.
- [ ] **Player improvements** — shuffle (preserves original order), repeat modes (off/all/one), desired-vs-actual state model. See [`docs/player-improvements.md`](docs/player-improvements.md).
- [ ] **Image compression** — server resizes cover/artist art on the fly (client already sends `?w=` params)
- [ ] **Album metadata extraction** — extract and expose embedded album art, lyrics, descriptions, credits (composer, conductor, engineer, producer, label, release date) from audio files. Scanner changes + new DB columns on albums/tracks + API fields + album detail page sections.
- [ ] **Import system** — per-source inbox folder for loose audio files. Drop files, analyze metadata, organize into Artist/Album tree, extract cover art, auto-scan. See [`docs/import-system.md`](docs/import-system.md).
- [ ] **Admin observability dashboard** — single admin page covering:
  - **Background jobs** — library scan, metadata enrichment, stream pre-encoding, cache cleanup. Status, last-run time, error logs. Toggle/reschedule/trigger manually.
  - **Streaming stats** — time-to-first-byte per track, playback errors, active streams, bandwidth usage, cache hit rate. Track over time to spot degradation.
  - **Player telemetry** — play/skip/pause counts, errors per track or format, buffer health. Collected via OTEL and exposed in the dashboard.
  - **OTEL integration** — the app already ships `@elysiajs/opentelemetry` and OTLP exporter. Instrument key metrics (TTFB per track, stream errors, job durations) as OTEL metrics/spans. Users can point Grafana/SigNoz/Jaeger at the OTLP endpoint for deeper analysis. The dashboard surface shows the essentials; OTEL handles the deep dive.

### Should-Have

- [ ] **Listen Together — Collab mode** — expand Listen Together with a collab mode where all participants can skip tracks, add to queue, and control playback, not just the host. Server-side permission relaxation for non-host clients, new `addTrack`/`removeTrack` message types, and control enablement for all participants in collab mode. UI for listen together should have on create for DJ and one for collab mode. Mode is set on creation and permissions accordingly.
- [ ] **Radio Mode** — frontend mode that appends songs/albums to the queue instead of replacing them. No interrupting the current song. Mostly a player state machine change, but the rest of the UI needs one unifed "add track" method, then let player handle details.
- [ ] **User-facing updates** — in-app banner when a new version is available
- [ ] **Preload next track** — prefetch next track's playback URL when near end of current track. See `docs/player-improvements.md#preloading-future`.
- [ ] **Playback event recording** — record every play/skip/seek as a timestamped event. Feeds smart playlists, history, scrobbling, and stats. Additive schema, safe after v1.0 but starts accumulating data earlier.
- [ ] **Custom cassette skins** — user-selectable cassette shell colors/materials. or even full replacements.

### Desktop Packaging

- [ ] **Compiled binary + OS service** — See `docs/desktop-packaging.md`. Preferred candidate: `bun build --compile` + systemd/launchd service install script. Other options (Tauri, Electron) documented for future reference.

### Done

- [x] **Library scanning & metadata enrichment** — background concurrency, ffprobe/mediabunny
- [x] **Artist/album/track browsing + search** — Fuse.js fuzzy search
- [x] **Audio playback** — HTTP range requests via `Bun.file()`
- [x] **Queue management** — shuffle, play/pause/skip/seek via Zustand
- [x] **Playlist CRUD** — create/edit/delete, add/remove tracks
- [x] **Multi-user auth** — JWT, admin setup, invitation system
- [x] **Listen Together (DJ mode)** — PartyKit room server, host/follower state sync with host-only controls
- [x] **Mobile UI** — drawer controls, swipe
- [x] **Dominant color extraction** — colorthief MMCQ
- [x] **Persistent database** — PGlite, survives restarts
- [x] **Docker image** — s6-overlay based
- [x] **AAC pre-encoding** — instant playback via lightweight streams

### Abandoned

- [~] **HLS streaming with pre-generated segment 0** — independent FFmpeg invocations cause AAC encoder state resets at segment boundaries. Audible hitches persist even with identical encoder params. Fix requires single continuous FFmpeg pass (high CPU at reload). AAC pre-encoding supersedes this. See `docs/HLS-HITCH-ANALYSIS.md`.
- [~] **Background playback on mobile** — browser freezes the tab ~5 min after screen off. No web API can prevent this (Chromium bug #41132724, open since 2014). Silent oscillator and Media Session API both failed. Requires a native Android app. See `docs/dead-ends/background-playback-mobile.md`.

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


### General refactor.

Need to seprate client and server state. main API file is growing excessively large with a lot of random functions scattered about. Consider how to put these into larger feature slices.

#### Route Extraction

Extract remaining inline routes from `src/index.tsx` into domain feature slices. Follow pattern from `auth.ts`, `admin.ts`, `playlist.ts`, `libraries.ts`.

- [ ] **1. Define `ServerContext` type** — consolidate RouteContext pattern into single shared context for all route modules
- [ ] **2. Extract `api/artists.ts`** — GET artists (list/search), GET artists/:artistId
- [ ] **3. Extract `api/albums.ts`** — GET albums (list/search), GET albums/:albumId, POST playAlbum/:albumId
- [ ] **4. Extract `api/tracks.ts`** — GET tracks, GET tracks/:trackId, POST player (playback URL)
- [ ] **5. Extract `api/media.ts`** — GET files/artistart/:artistId, GET files/albumart/:albumId, GET files/track/:trackId, GET assets, GET assets/:assetId, GET stream/:trackId, GET library/progress (SSE)
- [ ] **6. Extract `api/search.ts`** — GET search (unified across artists/albums/tracks)
- [ ] **7. Extract `api/stats.ts`** — GET stats
- [ ] **8. Tidy `src/index.tsx`** — leave only boot sequence (DB init, JWT setup, user seeding, library init, `.listen()`) + mounting extracted route modules

#### Client / Server State Boundary

Clean up mixing between client state (Zustand) and server state (React Query + API responses).

- [ ] **9. Unify `Track` types** — merge `Player.tsx` Track (client view-model with `duration`/colors/`album`) and `lib/types.ts` Track (server-model with `playtimeSeconds`/`albumId`/`path`). Single type with optional fields, or explicit conversion function.
- [ ] **10. Move React Query hooks out of `lib/api.ts`** — client-only code importing `@/Player`. Move to `client/hooks/` or colocate with pages.
- [ ] **11. Remove Zustand mutations from API hooks** — `usePlayPlaylist`/`usePlayAlbum` call `useAudioPlayer.use.queueSet()` inside `onSuccess`. Decouple: hook returns data, page handles store mutation.
- [ ] **12. Decouple `Player.tsx` from server-derived data** — store `Track` should be minimal client type (id, name, duration, artURL). Server enrichment (colors, album metadata) flows in from component layer.

#### Circular Dependency & Module Cleanup

- [ ] **13. Break `lib/eden.ts` → `@/index` circular dep** — extract `App` type into standalone file both can import without pulling in entire app module
- [ ] **14. Move server-only code out of `lib/`** — `dominant-color.ts` and `imageHandler.ts` use sharp/colorthief → `server/`
- [ ] **15. Move client-only code out of `lib/`** — `mediasession.tsx` (React hook, `navigator.mediaSession`) → `client/hooks/`. `api.ts` → `client/hooks/`
- [ ] **16. Prune duplicate modules** — `playlist_parser.ts` vs `new_playlist_parser.ts`, `audio_file_info.ts` vs `server/audio/`. Delete superseded files.
- [ ] **17. Make Fuse instances injectable** — replace module-level singletons in `lib/fuse.ts` with instances passed through route context

### App Testability Refactoring

Extract app factory from module-level side effects so routes can be tested in isolation.

- [x] **1.** Extract `db` object into a factory parameter — move `db` definition from `src/index.tsx` into a `createApp({ db })` function
- [x] **2.** Extract Fuse instances into factory parameters — move from `src/lib/fuse.ts` into the factory as `{ fuseInstances }`
- [x] **3.** Create `createApp()` factory — wraps Elysia app definition, accepts `{ db, fuseInstances, sources, env }`, returns app without `.listen()`
- [x] **4.** Remove `await reloadLibrary()` from module scope — move into a separate entry point (`src/server.tsx`) that calls `createApp()`, then `reloadLibrary()`, then `.listen()`
- [x] **5.** Remove `.listen()` from module scope — keep `src/index.tsx` as a pure app definition export
- [x] **6.** Make `reloadLibrary()` injectable — pass as parameter so tests can mock it
- [x] **7.** Make `parse()` and `loadPlaylists()` injectable — covered by context injection of `reloadLibrary`
- [x] **8.** Export `createApp` and types from `src/index.tsx` for test imports
- [x] **9.** Create test utility to build mock app — `tests/unit/test-utils.ts` with in-memory PGlite + Fuse instances

Target structure:
```
src/
├── index.tsx        # Export createApp(), types — no side effects
├── server.tsx       # Entry point: calls createApp(), reloadLibrary(), listen()
├── lib/
│   └── fuse.ts      # Keep as-is or export factory function
```

### Test Implementation Order

Tests before refactoring. Pure functions first, then extraction, then infrastructure, then integration.

#### Phase 1: Pure Utility Tests (no code changes needed)

- [x] **Math** — `clamp()` in `src/lib/math.ts`
- [x] **Utils** — `cn()`, `raise()`, `formatTime()` in `src/lib/utils.ts`
- [x] **Data types** — `Duration`, `DataSize` in `src/lib/data_type.ts`

#### Phase 2: Extract Pure Functions → Test

Extract module-private logic into shared lib, then test in same step.

- [x] **Track sorting** — move `compareTracksByNumberName()` from `src/index.tsx` to `src/lib/utils.ts` → test it
- [x] **Queue primitives** — extract `advance()`, `prev()`, `remove()`, `shuffleArray()` from `Player.tsx` store into `src/lib/queue.ts` → test them

#### Phase 3: App Testability Refactoring

See [`# App Testability Refactoring`](#app-testability-refactoring) above. Enables in-process integration tests.

- [x] Items 1-9 from App Testability Refactoring section

#### Phase 4: Integration Tests (uses `createApp()` factory)

In-memory app instances with mock data. No server spawn. Runs in-process.

- [x] **Stats:** `GET /api/stats` returns correct counts
- [x] **Artists:** list, search, by-id, unknown
- [x] **Albums:** list, search, by-id (with sorted tracks), unknown
- [x] **Tracks:** list, by-id, unknown
- [x] **Playlists:** list, by-id, unknown (CRUD needs filesystem-backed test env)
- [x] **Player:** `POST /api/player` (valid/missing trackId, unknown trackId, missing auth, no audio asset), `playAlbum`, `playPlaylist`
- [x] **Files:** album art, artist art (success + 404)
- [x] **Library:** reload endpoint (success + missing auth)

### Documentation & Process

- [ ] **Dead-ends convention** — `docs/dead-ends/<topic>.md` with problem, what was tried, why it failed, measurements. Reference from active plans so future work doesn't retread. Keep it lightweight — only create a file when the investigation was significant enough to warrant one.
- [ ] **Release process** — semver tags, GitHub Releases, Docker image tags. CHANGELOG.md stays as release history (date stamps are fine for a solo project — convert to semver at release time).
- [ ] **Production hardening** — auto-restart, signal handling, bare-metal startup docs (s6 covers Docker)
- [ ] **Stable API contract** — once v1.0 is near, version the API path (`/api/v1/...`) or declare stability guarantees

---

## Future / Ideas

Low-priority features and long-term ideas. Not scheduled for any release.

### Frontend Only

- [ ] **Keyboard shortcuts** — space for play/pause, arrows for seek/skip, up/down for volume. Pure DOM listener, no backend.
- [ ] **Crossfade / gapless playback** — overlap fade between tracks via Web Audio API `createGain()` + timing.
- [ ] **Equalizer / audio effects** — bass boost, preset EQs via `BiquadFilterNode`. Web Audio API pipeline.
- [ ] **Sleep timer** — stop playing in 15/30/60 min or end of track. Pure timer + pause action.
- [ ] **Undo queue clear** — snapshot queue before `queueSet()`, restore via Ctrl+Z or toast button.
- [ ] **Album shuffle** — pick a random album, play all tracks in order. Frontend queue logic.
- [ ] **Better mobile UI** — swipe-to-queue, track list gestures, haptic feedback.

### Frontend + Backend

- [ ] **Playback history** — log finished tracks with timestamp. New DB table + API + UI list.
- [ ] **Favorites / likes** — star a track, view all in a playlist. New DB table + API + star UI.
- [ ] **Ratings** — 1-5 stars on tracks. DB column or table + API + star picker UI.
- [ ] **Smart playlists** — auto-generated: most played, recently added, unplayed, favorites. Backend query rules + read-only playlist UI.
- [ ] **Last.fm / ListenBrainz scrobbling** — POST to external API on play. Settings form + scrobble queue.
- [ ] **Lyrics display** — fetch synced lyrics from LRCLIB or embedded tags. DB column + API + synchronized scrolling UI.
- [ ] **Offline downloads** — cache tracks via Service Worker + CacheStorage. Download button per album/playlist.
- [ ] **Audiobooks & podcasts** — long-form content with resume position, chapters, multi-disc grouping. RSS feed parsing for podcasts. Content type model extending the existing schema.
- [ ] **Release types** — EPs, Singles, Compilations, Live, Soundtrack, etc. New `release_type` column on `albums` (default `"album"`). Detected from `MUSICBRAINZ_RELEASETYPE` tag during enrichment. Frontend groups by type with section headers and badges. See [`docs/release-types.md`](docs/release-types.md).
- [ ] **events endpoint** - use event streaming for app events. know when libraries have changed, uploads finished, etc.
