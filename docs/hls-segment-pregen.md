# HLS Segment Architecture

## Goal

Reduce time-to-first-byte by pre-generating `segment_0000.ts` for every track
during library reload. All segments beyond index 0 are generated on-the-fly
as requested by the client.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| First-segment bitrate | Same as `HLS_BITRATE` (default `128k`) | Consistent quality across segments |
| Bitrate config | Env var `HLS_BITRATE`, default `"128k"` | Easy to change without code edits |
| Segment duration config | Env var `HLS_SEGMENT_DURATION`, default `10` | Consistent segment length |
| Pre-generation scope | `segment_0000.ts` only (~170 KB/track at 128k) | Tolerable storage (1000 tracks = ~170 MB); client preloads further segments |
| Segment generation | On-the-fly per index | No bulk encoding, no background promotion |
| Playlist generation | **Pure in-memory, from `playtimeSeconds`** | Deterministic — total segments = `ceil(playtimeSeconds / SD)`. No disk state needed. |
| ENDLIST | **Always present** | VOD track with known fixed duration. Player already knows all segment URLs from initial playlist; never needs to reload to "discover" new ones. |
| Pre-generation trigger | Auto during library reload when `HLS_ENABLED=true` | No extra toggle |
| Pre-generation concurrency | `pLimit(4)` | Limits CPU during reload |

## Core primitive

```typescript
generateSegment(trackPath, trackId, segmentIndex)
  → timeOffset = segmentIndex * SEGMENT_DURATION
  → ffmpeg -ss <timeOffset> -t <SEGMENT_DURATION> -i <trackPath>
      -codec:a aac -b:a <HLS_BITRATE> -f mpegts <cacheDir>/segment_N.ts
  → skips if file already exists (lock map prevents concurrent duplicates)
```

## Playlist endpoint

```
GET /api/hls/:trackId/playlist.m3u8

totalSegments = ceil(track.playtimeSeconds / HLS_SEGMENT_DURATION)

for i in 0..totalSegments-1:
  isLast = (i === totalSegments - 1)
  duration = isLast
    ? track.playtimeSeconds - i * SEGMENT_DURATION
    : SEGMENT_DURATION

  #EXTINF:{duration},
  segment_{i}.ts

#EXT-X-ENDLIST  // always — VOD, known duration
```

**No disk reads involved.** Pure arithmetic from DB field `playtimeSeconds`.

## Segment endpoint

```
GET /api/hls/:trackId/segment_N.ts

exists on disk?  → Bun.file(cacheDir/segment_N.ts)
else             → generateSegment(trackPath, trackId, N) → Bun.file(result)
```

## What this removes

| Gone | Replaced by |
|---|---|
| `generateAllSegments()` | Individual `generateSegment()` calls |
| `spawnAllSegments()` / background promotion map | Nothing needed |
| Temp playlist + atomic rename | No playlist file at all |
| Two-stage `getOrCreatePlaylist()` | `buildPlaylist()` — pure in-memory |
| `buildPartialPlaylist()` | Not needed — full deterministic playlist |
| ENDLIST logic / directory scanning | Always ENDLIST, always from math |
| `index.m3u8` on disk | Never written |
| Cache-expiry check on playlist | No playlist to stale-check |
| Staging / partial state detection | Only one state: segment files in cache dir |

## Disk state

- `hls-cache/<trackId>/segment_0000.ts` — pre-generated during reload (~170 KB)
- `hls-cache/<trackId>/segment_N.ts` — generated on-the-fly as requested, accumulates over time
- No playlist files, no temp files
- 24h TTL cleanup removes stale segment dirs (unchanged)

## Storage estimate (1000 tracks)

| Item | Size |
|------|------|
| segment_0000.ts (1000 × 170 KB) | ~170 MB |
| On-demand segments | Appears over time as tracks are played |

## Implementation status

| File | Status |
|------|--------|
| `src/server/hls.ts` | Done — `buildPlaylist()` replaces `getOrCreatePlaylist()`. `generateSegmentAt()` with per-segment lock map handles on-the-fly generation. All bulk/promotion code removed. |
| `src/index.tsx` | Done — playlist endpoint calls `buildPlaylist(trackId, playtimeSeconds)`. Segment endpoint generates on-the-fly via `generateSegment()` on miss. |
| `src/shared/env.ts` | Done — `HLS_BITRATE`, `HLS_SEGMENT_DURATION` added |
| `src/server/library.ts` | Done — `onEnrichmentComplete` hook added |

## Edge cases

| Scenario | Behavior |
|----------|----------|
| Track < SD | `totalSegments = 1`. Last segment duration = `playtimeSeconds`. `segment_0000.ts` generated on demand or pre-generated. |
| Segment request race (two clients, same seg) | Lock map on `generateSegment` — first caller encodes, second gets cached path |
| `playtimeSeconds` inaccurate | Playlist says N segments, but track actually produces N-1. Last segment request hits ffmpeg → fails → 404. Player retries and recovers. |
| ffmpeg failure on segment encode | `generateSegment` throws → segment endpoint returns 500 → player retries |
| Library reload during playback | Pre-generation only writes segment_0000.ts; existing segment files untouched. If track was mid-play, its segment dir remains. |
| HLS disabled | `onEnrichmentComplete` hook returns early; HLS endpoints return 404 |
| ffmpeg not found | Pre-generation skips with warning; segment endpoint returns 500 on first encode attempt |

## Future

The architecture is already the end state: **on-the-fly per-segment generation**.
The only optional extension is pre-generating more than segment 0
(e.g., pre-generate next N segments when a track starts playing) — but that's a
client-side prefetch concern, not server infrastructure.
