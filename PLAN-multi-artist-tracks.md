# Multi-Artist Track Support — Implementation Plan

Add support for compilation albums and collaborative tracks via a `track_artists` junction table.

## Status

```
□ = todo   ◐ = in progress   ✓ = done
```

---

## Phase 1: Schema

- [ ] **1a.** Add `track_artists` table to `src/db/schema.ts`
  - Columns: `id`, `trackId` (FK→tracks), `artistId` (FK→artists), `role` (text, default "primary"), `position` (int)
  - Indexes: `(trackId)`, `(artistId)`, unique `(trackId, artistId, role)`
  - `albums.artistId` stays NOT NULL — compilations use "Various Artists" Artist
- [ ] **1b.** Generate & apply migration
  ```bash
  bun run db:generate && bun run db:up
  ```

## Phase 2: Types (`src/lib/types.ts`)

- [ ] **2a.** Add `TrackArtist` type (`id`, `name`, `role`)
- [ ] **2b.** Add `artists?: TrackArtist[]` to `Track` type

## Phase 3: Scanner (`src/server/library.ts`)

- [ ] **3a.** Add `parseArtistNames(tag)` helper — splits on `,`, `&`, `feat.`, `ft.`, `featuring`, `/`, `;`
- [ ] **3b.** Add `upsertTrackArtists(trackId, entries[])` method
  - Deletes stale entries for the track, inserts fresh ones
- [ ] **3c.** Update `addFromMetadata()` — parse `artistName` tag into multiple artists, call `upsertTrackArtists`
  - Album artist from `albumArtistName || dirArtist || "Unknown Artist"`
  - Track artists from `parseArtistNames(info.artistName) || [albumArtist]`
- [ ] **3d.** Track stableId — change to use `filePath` instead of `artistName/albumName/title` (more stable)
- [ ] **3e.** Backfill existing tracks — populate `track_artists` with single "primary" entry pointing to `album.artistId`

## Phase 4: Library Query Methods (`src/server/library.ts`)

- [ ] **4a.** `getTrackArtists(trackId)` — JOIN artists + track_artists, ordered by position
- [ ] **4b.** `getTrackArtistsBatch(trackIds)` — batch version for N+1 prevention
- [ ] **4c.** `getArtistAppearances(artistId)` — albums where artist contributed via track_artists but is not album artist

## Phase 5: API Endpoints (`src/index.tsx`)

- [ ] **5a.** `GET /api/albums/:albumId` — include `artists` on each track (batch-load)
- [ ] **5b.** `GET /api/artists/:artistId` — add `appearances` array (compilations featuring this artist)
- [ ] **5c.** `GET /api/tracks` and `GET /api/tracks/:trackId` — include artists
- [ ] **5d.** `POST /api/playAlbum/:albumId` — include artists on tracks
- [ ] **5e.** `POST /api/player` — include artists in response

## Phase 6: Search (`src/server/search.ts` + `src/lib/fuse.ts`)

- [ ] **6a.** Update `buildIndex()` — join all track artist names into `artistName` field for Fuse
- [ ] **6b.** Add `artistName` key to `fuse_tracks` config in `src/lib/fuse.ts`

## Phase 7: Frontend — TrackRow

- [ ] **7a.** Add `artists?: { name: string; role: string }[]` to `TrackData` interface
- [ ] **7b.** Render artist subtitle when track artists differ from album artist

## Phase 8: Frontend — Player

- [ ] **8a.** Add `artists` field to Player `Track` type (`src/Player.tsx`)
- [ ] **8b.** `src/lib/api.ts` — map `track.artists` from API into player tracks in `usePlayAlbum` / `usePlayPlaylist`
- [ ] **8c.** `src/QueueList.tsx` — show artist name next to track name
- [ ] **8d.** `src/client/components/PlaybackDetails.tsx` — show artist name under track title

## Phase 9: Frontend — Pages

- [ ] **9a.** `src/routes/albums/$id.tsx` — pass `track.artists` through to `TrackRow`
- [ ] **9b.** `src/routes/artists/$id.tsx` — add "Appearances" grid section for compilation albums

## Phase 10: Verify

- [ ] **10a.** `bun run check` — pass lint + typecheck
- [ ] **10b.** Manual test: scan a "Various Artists" directory, verify tracks show per-artist names
- [ ] **10c.** Manual test: scan a directory with "feat." tags, verify featured artists appear
- [ ] **10d.** Search for a featured artist — verify their collaborative tracks appear in results
- [ ] **10e.** Artist page — verify "Appearances" section shows compilation albums
