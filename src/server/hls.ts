import { $ } from "bun"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "fs"
import { join } from "path"
import { env } from "@/shared/env"
import pLimit from "p-limit"

const BITRATE = env.HLS_BITRATE
const SEGMENT_DURATION = env.HLS_SEGMENT_DURATION
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

function cacheDir(): string {
  return env.HLS_CACHE_DIR ?? join(env.DATA_PATH, "hls-cache")
}

function trackCacheDir(trackId: string): string {
  return join(cacheDir(), trackId)
}

function ensureTrackCacheDir(trackId: string): string {
  const dir = trackCacheDir(trackId)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function segmentFilename(segmentIndex: number): string {
  return `segment_${String(segmentIndex).padStart(4, "0")}.ts`
}

export function buildPlaylist(
  trackId: string,
  playtimeSeconds: number,
): string {
  const totalSegments = Math.ceil(playtimeSeconds / SEGMENT_DURATION)
  const lines: string[] = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    `#EXT-X-TARGETDURATION:${Math.ceil(SEGMENT_DURATION)}`,
    "#EXT-X-MEDIA-SEQUENCE:0",
  ]

  for (let i = 0; i < totalSegments; i++) {
    const isLast = i === totalSegments - 1
    const remainder = playtimeSeconds % SEGMENT_DURATION
    const duration = isLast && remainder !== 0 ? playtimeSeconds - i * SEGMENT_DURATION : SEGMENT_DURATION

    lines.push(`#EXTINF:${duration.toFixed(3)},`)
    lines.push(segmentFilename(i))
  }

  lines.push("#EXT-X-ENDLIST")
  return lines.join("\n")
}

type SegmentStatus = "pending" | "encoding" | "complete" | "failed"

type TrackCache = {
  total: number
  segments: SegmentStatus[]
  encodePromise: Promise<void> | null
  seg0Promise: Promise<void> | null
}

const tracksCache = new Map<string, TrackCache>()

export function initTrackCache(trackId: string, playtimeSeconds: number): void {
  if (tracksCache.has(trackId)) return

  const total = Math.ceil(playtimeSeconds / SEGMENT_DURATION)
  const dir = trackCacheDir(trackId)
  const segments: SegmentStatus[] = []
  for (let i = 0; i < total; i++) {
    const segPath = join(dir, segmentFilename(i))
    segments.push(existsSync(segPath) ? "complete" : "pending")
  }
  tracksCache.set(trackId, { total, segments, encodePromise: null, seg0Promise: null })
}

export function ensureTrackEncode(trackPath: string, trackId: string): void {
  const cache = tracksCache.get(trackId)
  if (!cache) throw new Error("Track cache not initialized")
  if (cache.encodePromise) return
  if (cache.segments.every((s) => s === "complete")) return

  for (let i = 1; i < cache.total; i++) {
    if (cache.segments[i] === "pending") {
      cache.segments[i] = "encoding"
    }
  }

  const onDone = () => {
    for (let i = 1; i < cache.total; i++) {
      if (cache.segments[i] === "encoding") {
        cache.segments[i] = "complete"
      }
    }
  }

  const onFail = () => {
    for (let i = 1; i < cache.total; i++) {
      if (cache.segments[i] === "encoding") {
        cache.segments[i] = "failed"
      }
    }
  }

  cache.encodePromise = doEncodeAll(trackPath, trackId).then(onDone, onFail)
  cache.encodePromise.finally(() => {
    cache.encodePromise = null
  })
}

export async function requestSegment(
  trackPath: string,
  trackId: string,
  segmentIndex: number,
): Promise<ArrayBuffer> {
  const cache = tracksCache.get(trackId)
  if (!cache) throw new Error("Track cache not initialized")

  if (segmentIndex === 0) {
    const s0 = cache.segments[0]
    if (s0 === "complete") return readSegment(trackId, 0)
    if (s0 === "failed") throw new Error("Segment generation failed")

    if (!cache.seg0Promise) {
      cache.seg0Promise = (async () => {
        cache.segments[0] = "encoding"
        try {
          await generateFirstSegment(trackPath, trackId)
          cache.segments[0] = "complete"
          if (!cache.encodePromise) ensureTrackEncode(trackPath, trackId)
        } catch {
          cache.segments[0] = "failed"
        }
      })()
    }
    await cache.seg0Promise
    if (cache.segments[0] === "complete") return readSegment(trackId, 0)
    throw new Error("Segment generation failed")
  }

  const status = cache.segments[segmentIndex]
  if (status === "complete") return readSegment(trackId, segmentIndex)
  if (status === "failed") throw new Error("Segment generation failed")

  if (status === "pending" || status === "encoding") {
    if (!cache.encodePromise) ensureTrackEncode(trackPath, trackId)
    await cache.encodePromise
    if (cache.segments[segmentIndex] === "complete") return readSegment(trackId, segmentIndex)
    throw new Error("Segment generation failed")
  }

  throw new Error(`Unknown segment status: ${status}`)
}

async function readSegment(trackId: string, index: number): Promise<ArrayBuffer> {
  const dir = trackCacheDir(trackId)
  const path = join(dir, segmentFilename(index))
  return Bun.file(path).arrayBuffer()
}

async function doEncodeAll(
  trackPath: string,
  trackId: string,
): Promise<void> {
  const dir = ensureTrackCacheDir(trackId)
  const segmentPattern = join(dir, "segment_%04d.ts")

  if (!Bun.which("ffmpeg")) {
    throw new Error("ffmpeg not found in PATH")
  }

  console.log("[HLS] Encoding all segments for track", trackId)
  const proc = await $`ffmpeg -ss ${SEGMENT_DURATION} -i ${trackPath} \
    -codec:a aac \
    -b:a ${BITRATE} \
    -vn \
    -muxdelay 0 \
    -muxpreload 0 \
    -f segment \
    -segment_time ${SEGMENT_DURATION} \
    -segment_start_number 1 \
    -reset_timestamps 1 \
    -loglevel warning \
    ${segmentPattern}`.quiet()

  if (proc.exitCode !== 0) {
    const stderr = proc.stderr.toString()
    console.error("[HLS] FFmpeg failed for track", trackId, ":", stderr)
    throw new Error(`FFmpeg exited with code ${proc.exitCode}`)
  }

  console.log("[HLS] All segments encoded for track", trackId)
}

// Pre-generates segment 0 for a track.
// NOTE: This independent ffmpeg invocation still causes an audible hitch at the
// segment 0 → 1 boundary because AAC encoder state is not carried across invocations.
// Even with identical muxer (-f segment) and -muxdelay 0, the boundary is not gapless.
// To fully eliminate the hitch, ALL segments must be produced in a single continuous
// ffmpeg pass (no pre-generation). See HLS-HITCH-ANALYSIS.md for details.
export async function generateFirstSegment(
  trackPath: string,
  trackId: string,
): Promise<void> {
  const dir = ensureTrackCacheDir(trackId)

  if (existsSync(join(dir, segmentFilename(0)))) return

  if (!Bun.which("ffmpeg")) {
    throw new Error("ffmpeg not found in PATH")
  }

  const segmentPattern = join(dir, "segment_%04d.ts")

  const proc = await $`ffmpeg -ss 0 -t ${SEGMENT_DURATION} -i ${trackPath} \
    -codec:a aac \
    -b:a ${BITRATE} \
    -vn \
    -muxdelay 0 \
    -muxpreload 0 \
    -f segment \
    -segment_time 86400 \
    -segment_start_number 0 \
    -reset_timestamps 1 \
    -loglevel warning \
    ${segmentPattern}`.quiet()

  if (proc.exitCode !== 0) {
    const stderr = proc.stderr.toString()
    console.error("[HLS] FFmpeg failed pre-generating first segment:", stderr)
    throw new Error(`FFmpeg exited with code ${proc.exitCode}`)
  }
}

export async function pregenerateFirstSegments(
  tracks: { id: string; path: string }[],
): Promise<void> {
  if (tracks.length === 0) return

  if (!Bun.which("ffmpeg")) {
    console.warn("[HLS] ffmpeg not found in PATH, skipping first-segment pre-generation")
    return
  }

  console.log("[HLS] Pre-generating first segment for", tracks.length, "tracks")
  const limit = pLimit(4)
  let completed = 0
  const jobs = tracks.map((t) =>
    limit(async () => {
      try {
        await generateFirstSegment(t.path, t.id)
        completed++
        if (completed % 100 === 0) {
          console.log("[HLS] Pre-generated", completed, "/", tracks.length)
        }
      } catch (err) {
        console.error("[HLS] Failed to pre-generate first segment for track", t.id, ":", err)
      }
    }),
  )
  await Promise.allSettled(jobs)
  console.log("[HLS] Pre-generated first segment for", completed, "/", tracks.length, "tracks")
}

export function cleanupHlsCache(): void {
  const dir = cacheDir()
  if (!existsSync(dir)) return

  const now = Date.now()
  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry)
    try {
      const stats = statSync(entryPath)
      if (stats.isDirectory() && now - stats.mtimeMs > CACHE_TTL_MS) {
        rmSync(entryPath, { recursive: true, force: true })
        tracksCache.delete(entry)
      }
    } catch {
      // skip entries we can't stat
    }
  }
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null

export function startHlsCleanup(): void {
  if (cleanupInterval) return
  cleanupHlsCache()
  cleanupInterval = setInterval(cleanupHlsCache, CLEANUP_INTERVAL_MS)
}

export function stopHlsCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}
