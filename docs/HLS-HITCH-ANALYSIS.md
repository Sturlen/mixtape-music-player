# HLS Segment Boundary Hitch Analysis

**Problem:** Audible hitch at the 10s mark (segment 0 → segment 1 boundary). No hitch between segments 1→2, 2→3, etc.

**Root cause:** Segment 0 is pre-generated with `-f mpegts` muxer during library reload. Segments 1+ are generated at play time with `-f segment` muxer. Different packetization, PTS/DTS spacing, and ADTS framing cause the AAC decoder to see a discontinuity.

---

## Approach 1: Pre-gen segment 0 with `-f segment`, keep bulk pass for rest

Pre-generate segment 0 using the same `-f segment` muxer as the bulk pass, instead of `-f mpegts`.

**Pre-gen:**
```
ffmpeg -ss 0 -t 10 -i track.mp3 -c:a aac -b:a 128k -vn \
  -f segment -segment_time 10 -segment_start_number 0 segment_%04d.ts
```

**Bulk (unchanged):**
```
ffmpeg -ss 10 -i track.mp3 -c:a aac -b:a 128k -vn \
  -f segment -segment_time 10 -segment_start_number 1 segment_%04d.ts
```

| Pro | Con |
|-----|-----|
| Directly addresses the known muxer mismatch | Boundary 0→1 crosses two independent ffmpeg invocations — AAC encoder state is reset |
| Minimal code change (~3 lines) | `-ss` before `-i` is not sample-accurate: seeks to nearest MP3 frame boundary (±26ms). Seg 0 = 0-10s exact. Bulk start is `-ss 10` which may land at ~10.026s, leaving a 26ms gap. |
| Pre-gen keeps TTFB ≈ 0 | |
| Low risk, easy to test | If the hitch persists, the culprit is the `-ss` imprecision |

**If it works:** The hitch was purely the muxer difference. **If it doesn't:** The hitch is from the sample gap between independent invocations.

---

## Approach 2: Individual segment encoding (user's "generate each individually")

Replace both pre-gen and bulk with a single parameterized function:

```typescript
async function encodeSegment(trackPath, trackId, index) {
  const start = index * 10
  const dur = 10
  await $`ffmpeg -ss ${start} -t ${dur} -i ${trackPath} \
    -c:a aac -b:a 128k -vn \
    -f segment -segment_time ${dur} \
    -segment_start_number ${index} -reset_timestamps 1 \
    segment_%04d.ts`
}
```

Pre-gen calls `encodeSegment(trackPath, id, 0)`. Playback calls `encodeSegment(trackPath, id, N)` on demand for any missing segment.

| Pro | Con |
|-----|-----|
| Exactly the same ffmpeg pipeline for every segment | `-ss` before `-i` drift **compounds**: each invocation can be off by ±26ms. After 6 segments (60s), cumulative drift reaches ±156ms. Segment 3 might overlap segment 4 by 26ms or have a 26ms gap. |
| Conceptually clean: one path, no special cases | `-ss` after `-i` (sample-accurate) is too slow — must decode all audio from 0 to seek point (~1s for 60s at 60x decode speed). Can't keep up with real-time playback. |
| Pre-gen keeps TTFB low | 12 ffmpeg spawns for a 2-min track instead of 1 — process overhead adds up |
| | Each invocation re-initializes the AAC encoder — identical to the boundary problem in approach 1 but now at EVERY segment boundary instead of just 0→1 |

**Verdict:** Likely to produce WORSE hitching than the current code — every segment boundary becomes a potential discontinuity instead of just the first one.

---

## Approach 3: Eager full encode during library reload

During library scan, encode every track completely to segments. All segments are on disk before any play request arrives.

```
ffmpeg -i track.mp3 -c:a aac -b:a 128k -vn \
  -f segment -segment_time 10 segment_%04d.ts
```

| Pro | Con |
|-----|-----|
| Zero encoding at play time (TTFB ≈ 0 always) | CPU spike during library reload — encoding 400 tracks × 4min × 1000x realtime ≈ 96 seconds of encode time |
| Single continuous ffmpeg invocation = sample-accurate boundaries, no hitches | Disk: ~1MB/min per track. 1000 tracks @ 4min avg = ~4GB |
| Simplest possible runtime code — just serve files | New tracks added after reload need on-demand fallback anyway (hybrid required) |
| | Library reload already slow from metadata extraction — adding encode makes it worse |

**Verdict:** Best for playback quality, worst for reload time and disk. If the library is small (< 100 tracks) this is the best option.

---

## Approach 4: Transcode once to full AAC, serve via HTTP range requests

Eliminate HLS entirely. During library scan (or first play), transcode each track to a single AAC file. Serve via HTTP range requests (`Bun.file()` native support).

```
fmpeg -i track.mp3 -c:a aac -b:a 128k -vn cache/trackId.aac
```

Frontend uses plain `<audio>` element instead of hls.js. Browser requests byte ranges for seeking.

| Pro | Con |
|-----|-----|
| **No segments = no segment boundary hitches** | Major refactor: remove HLS from frontend and backend |
| `Bun.file()` serves range requests natively — zero server code | Seeking accuracy depends on MP4 moof atom layout (fragmented vs non-fragmented) |
| Same total CPU as HLS (one encode per track) | Higher bandwidth if seeking a lot (browser re-requests from new offset) |
| Simpler frontend — plain `<audio>` element with no hls.js dependency | Client-side settings UI references HLS toggle — needs updating |
| Pre-gen: same eager tradeoff as other approaches | |

**Verdict:** Cleanest architectural solution, but highest change cost. Only worth the effort if you're removing HLS entirely.

---

## Approach 5: Hybrid — full pre-gen via continuous encode, cache on disk

During library reload, encode the full track to a temp directory, producing all segments with perfect alignment, then move to cache:

```
fmpeg -i track.mp3 -c:a aac -b:a 128k -vn \
  -f segment -segment_time 10 /tmp/trackId/segment_%04d.ts
mv /tmp/trackId/ $CACHE_DIR/trackId/
```

At play time, everything is already on disk.

| Pro | Con |
|-----|-----|
| Perfect sample-accurate boundaries — single continuous ffmpeg invocation | Same CPU cost as approach 3 during reload |
| TTFB ≈ 0 — serve from disk | Disk cost same as approach 3 |
| Pre-generation guarantee: all segments ready before first play | Fallback for new tracks needs on-demand generation |

**Verdict:** Same tradeoffs as approach 3 but without the architectural change. Best play quality, worst reload time.

---

## Summary Table

| Approach | Fixes Hitch | TTFB | Compounding Drift | Code Change | Reload CPU | Disk |
|----------|-------------|------|-------------------|-------------|------------|------|
| **1** Pre-gen seg 0 with `-f segment` | Probably | ≈0 | No (single boundary) | ~3 lines | None added | None added |
| **2** Individual per-segment encode | **No — makes it worse** | ≈0 | **Yes — ±26ms per segment** | Moderate | None added | None added |
| **3** Eager full encode at reload | Yes | ≈0 | No | Moderate | High | High |
| **4** Range-request full AAC | Yes (no segments) | ≈0 | N/A | Major refactor | Medium (same encode) | Medium |
| **5** Hybrid: full pre-gen, cache all | Yes | ≈0 | No | Moderate | High | High |

## Recommendation

**Start with Approach 1** (pre-gen seg 0 with `-f segment`). It directly tests whether the hitch is from the muxer mismatch. If it works, you're done. If not, the root cause is `-ss` imprecision between independent ffmpeg invocations, and you need Approach 3/5 (continuous single-pass encode) to get sample-accurate boundaries.

---

## Approach 1 Outcome — DEAD END

Approach 1 was implemented and tested with the following refinements:

- Same `-f segment` muxer for both pre-gen and bulk
- `-muxdelay 0 -muxpreload 0` to eliminate PTS offset (`start_time=0.000000` confirmed via ffprobe)
- Pre-gen `-segment_time 86400` to prevent spurious tiny second segment
- On-demand seg0 fallback in `requestSegment` for tracks without pre-generated segment 0

**Result:** Hitch at 10s boundary persists. Two independent ffmpeg invocations produce an audible discontinuity even with identical encoder parameters.

### Analysis

Two independent ffmpeg invocations → two independent AAC encoder instances:

1. **AAC encoder state discontinuity** — Each encoder initializes with a fresh bit reservoir, different frame alignment, and different initial state vectors. The first few AAC frames after initialization audibly differ from what a continuous encoder would produce at that point in the stream.

2. **`-ss` seek imprecision** — Pre-gen (`-ss 0`) is frame-exact. Bulk start (`-ss 10`) seeks to the nearest MP3 frame boundary, which can be up to ±26ms off. This creates a small gap or overlap at the boundary.

Both factors contribute. Even eliminating one (e.g., using a sample-accurate seek) would not fix the encoder state discontinuity.

### Conclusion

**Pre-generation of segment 0 via an independent ffmpeg invocation cannot produce a gapless boundary.** No combination of muxer flags, muxdelay settings, or seek strategies can bridge the AAC encoder state gap.

The only fix is Approach 3/5: a single continuous ffmpeg invocation that produces all segments in one pass. This eliminates both the encoder state discontinuity and the `-ss` imprecision, because the segment muxer splits along continuous PTS with no gaps.
