# HLS First-Segment Pre-generation

## Goal

Reduce time-to-first-byte on music playback by pre-generating the first HLS segment
for every track during library reload, so it's available instantly when a user hits play.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| First-segment bitrate | Same as `HLS_BITRATE` (default `128k`) | Keeps quality consistent. No audible quality jump between first and subsequent segments. |
| Bitrate config | Env var `HLS_BITRATE`, default `"128k"` | Easy to change later without code edits. |
| Segment duration config | Env var `HLS_SEGMENT_DURATION`, default `10` | Consistent segment length across all tracks. |
| Storage strategy | Pre-generate only segment `0` (~170 KB/track at 128k) | 1000 tracks = ~170 MB. Tolerable for modern storage. |
| First-play promotion | Overwrite first segment at full quality | Simpler than keeping the pre-generated version. Player already has first segment buffered, so no disruption. |
| Pre-generation trigger | Auto during library reload when `HLS_ENABLED=true` | No extra user toggle needed. |
| Concurrency | `pLimit(4)` for pre-generation | Limits CPU-heavy ffmpeg encodes during reload. |

## Architecture

### Core primitives (`src/server/hls.ts`)

```
generateSegment(trackPath, trackId, segmentIndex)
  └─ generateSegmentAt(trackPath, trackId, timeOffset, segmentIndex)
       └─ ffmpeg -ss <offset> -t <duration> -i <input> ...
             ↓
       segment_0000.ts  (or segment_N.ts)

generateAllSegments(trackPath, trackId)
  └─ ffmpeg HLS muxer → index.temp.m3u8 → atomic rename → index.m3u8

pregenerateFirstSegments(tracks[])
  └─ pLimit(4), each → generateFirstSegment(p, id) → generateSegment(p, id, 0)
```

### Playback flow

```
1. Reload  →  pregenerateFirstSegments()  →  segment_0000.ts for every track

2. Play     →  GET playlist.m3u8
               ├─ index.m3u8 exists?        → return it (done)
               ├─ only segment_0000.ts?     → build partial playlist in-memory,
               │                               spawn generateAllSegments() in bg,
               │                               return partial playlist
               └─ nothing exists?           → generateAllSegments() sync (fallback)

3. Player plays segment_0000.ts instantly (file on disk, zero TTFB)
   Ffmpeg finishes → index.temp.m3u8 renamed → index.m3u8

4. Player reloads playlist → finds full playlist → continues
```

### Partial playlist (no `#EXT-X-ENDLIST`)

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.000,
segment_0000.ts
```

No ENDLIST signals the player to reload for new segments.

## Edge cases handled

| Scenario | Behavior |
|----------|----------|
| Track < 10s | First segment covers whatever duration exists. No special handling needed. |
| Concurrent playlist requests for same track | Lock map prevents spawning multiple ffmpeg processes. |
| Concurrent first-play + reload | Pre-generation creates cache dirs under track IDs; existing dirs untouched. |
| ffmpeg failure during pre-generation | Caught per-track, logged, continues to next track. |
| ffmpeg failure during first-play promotion | Lock-map promise rejects → deleted from map → next request retries synchronously. |
| Empty library | `getAllTracks()` returns `[]` → no-op. |
| 24h cache TTL | Unchanged. Pre-generated dirs cleaned by existing `cleanupHlsCache()`. |
| Library reload while track playing | Pre-generation only writes segment_0000.ts; existing playlists untouched. |
| HLS disabled (`HLS_ENABLED=false`) | `onEnrichmentComplete` hook checks and returns early. |
| ffmpeg not found in PATH | Logs error, skips pre-generation without crashing reload. |

## Future: On-the-fly segment generation

The `generateSegment(trackPath, trackId, N)` primitive is designed for eventual
per-segment on-demand generation:

- Replace `generateAllSegments()` entirely
- When client requests `segment_0005.ts` and it doesn't exist → call
  `generateSegment(trackPath, trackId, 5)` and serve the result
- First segment pre-generation is just a head-start on segment index 0

## Env vars added

| Variable | Default | Description |
|----------|---------|-------------|
| `HLS_BITRATE` | `"128k"` | Audio bitrate for HLS segments (ffmpeg `-b:a` syntax) |
| `HLS_SEGMENT_DURATION` | `10` | HLS segment duration in seconds |
