import { $ } from "bun"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  readFileSync,
  renameSync,
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

function buildPartialPlaylist(duration: number): string {
  return [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    `#EXT-X-TARGETDURATION:${Math.ceil(SEGMENT_DURATION)}`,
    "#EXT-X-MEDIA-SEQUENCE:0",
    `#EXTINF:${duration.toFixed(3)},`,
    segmentFilename(0),
  ].join("\n")
}

export async function generateSegmentAt(
  trackPath: string,
  trackId: string,
  timeOffset: number,
  segmentIndex: number,
): Promise<string> {
  const dir = ensureTrackCacheDir(trackId)
  const filename = segmentFilename(segmentIndex)
  const outputPath = join(dir, filename)

  if (existsSync(outputPath)) return outputPath

  if (!Bun.which("ffmpeg")) {
    throw new Error("ffmpeg not found in PATH")
  }

  const proc = await $`ffmpeg -ss ${timeOffset} -t ${SEGMENT_DURATION} -i ${trackPath} \
    -codec:a aac \
    -b:a ${BITRATE} \
    -f mpegts \
    ${outputPath}`.quiet()

  if (proc.exitCode !== 0) {
    const stderr = proc.stderr.toString()
    console.error("[HLS] FFmpeg failed generating segment", segmentIndex, "for track", trackId, ":", stderr)
    throw new Error(`FFmpeg exited with code ${proc.exitCode}`)
  }

  return outputPath
}

export async function generateSegment(
  trackPath: string,
  trackId: string,
  segmentIndex: number,
): Promise<string> {
  return generateSegmentAt(trackPath, trackId, segmentIndex * SEGMENT_DURATION, segmentIndex)
}

export async function generateFirstSegment(
  trackPath: string,
  trackId: string,
): Promise<void> {
  await generateSegment(trackPath, trackId, 0)
}

export async function generateAllSegments(
  trackPath: string,
  trackId: string,
): Promise<void> {
  const dir = ensureTrackCacheDir(trackId)
  const segmentPattern = join(dir, "segment_%04d.ts")
  const tempPlaylist = join(dir, "index.temp.m3u8")
  const finalPlaylist = join(dir, "index.m3u8")

  if (!Bun.which("ffmpeg")) {
    throw new Error("ffmpeg not found in PATH")
  }

  const proc = await $`ffmpeg -i ${trackPath} \
    -codec:a aac \
    -b:a ${BITRATE} \
    -hls_time ${SEGMENT_DURATION} \
    -hls_list_size 0 \
    -hls_segment_filename ${segmentPattern} \
    -vn \
    ${tempPlaylist}`.quiet()

  if (proc.exitCode !== 0) {
    const stderr = proc.stderr.toString()
    console.error("[HLS] FFmpeg failed generating all segments for track", trackId, ":", stderr)
    if (existsSync(tempPlaylist)) rmSync(tempPlaylist)
    throw new Error(`FFmpeg exited with code ${proc.exitCode}`)
  }

  renameSync(tempPlaylist, finalPlaylist)
}

const generationLocks = new Map<string, Promise<void>>()

function spawnAllSegments(trackPath: string, trackId: string): Promise<void> {
  const existing = generationLocks.get(trackId)
  if (existing) return existing

  const promise = generateAllSegments(trackPath, trackId).finally(() => {
    generationLocks.delete(trackId)
  })
  generationLocks.set(trackId, promise)
  return promise
}

export async function getOrCreatePlaylist(
  trackPath: string,
  trackId: string,
): Promise<string> {
  const dir = trackCacheDir(trackId)
  const playlistPath = join(dir, "index.m3u8")
  const firstSegPath = join(dir, segmentFilename(0))

  if (existsSync(playlistPath)) {
    return readFileSync(playlistPath, "utf-8")
  }

  if (existsSync(firstSegPath)) {
    console.log("[HLS] Partial cache hit, promoting track", trackId)
    const partial = buildPartialPlaylist(SEGMENT_DURATION)
    spawnAllSegments(trackPath, trackId)
    return partial
  }

  console.log("[HLS] Cache miss, generating segments for track", trackId, "at", trackPath)
  const start = performance.now()
  await generateAllSegments(trackPath, trackId)
  console.log("[HLS] Generated segments in", (performance.now() - start).toFixed(0), "ms for track", trackId)

  return readFileSync(playlistPath, "utf-8")
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

export function getSegmentPath(
  trackId: string,
  filename: string,
): string | null {
  const dir = trackCacheDir(trackId)
  const resolved = resolveSafe(dir, filename)
  if (!resolved) return null
  if (!existsSync(resolved)) return null
  return resolved
}

function resolveSafe(base: string, target: string): string | null {
  const normalized = join(base, target)
  if (!normalized.startsWith(base)) return null
  return normalized
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
