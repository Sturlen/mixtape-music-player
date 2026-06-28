import { $ } from "bun"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  readFileSync,
} from "fs"
import { join } from "path"
import { env } from "@/shared/env"

const SEGMENT_DURATION = 10
const BITRATE = "128k"
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

async function generateSegments(
  trackPath: string,
  trackId: string,
): Promise<void> {
  const dir = ensureTrackCacheDir(trackId)
  const segmentPattern = join(dir, "segment_%04d.ts")
  const playlistPath = join(dir, "index.m3u8")

  console.log("[HLS] Running FFmpeg for track", trackId, ": -i", trackPath, "→", dir)

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
    ${playlistPath}`.quiet()

  if (proc.exitCode !== 0) {
    const stderr = proc.stderr.toString()
    console.error("[HLS] FFmpeg failed for track", trackId, ":", stderr)
    throw new Error("FFmpeg exited with code " + proc.exitCode)
  }

  console.log("[HLS] FFmpeg done for track", trackId)
}

export async function getOrCreatePlaylist(
  trackPath: string,
  trackId: string,
): Promise<string> {
  const dir = trackCacheDir(trackId)
  const playlistPath = join(dir, "index.m3u8")

  const start = performance.now()

  if (!existsSync(playlistPath)) {
    console.log("[HLS] Cache miss, generating segments for track", trackId, "at", trackPath)
    await generateSegments(trackPath, trackId)
    console.log("[HLS] Generated segments in", (performance.now() - start).toFixed(0), "ms for track", trackId)
  } else {
    try {
      const stats = statSync(dir)
      const now = Date.now()
      if (now - stats.mtimeMs > CACHE_TTL_MS) {
        console.log("[HLS] Cache expired for track", trackId, "(age:", ((now - stats.mtimeMs) / 1000 / 60 / 60).toFixed(0), "hours)")
        rmSync(dir, { recursive: true, force: true })
        await generateSegments(trackPath, trackId)
        console.log("[HLS] Regenerated segments in", (performance.now() - start).toFixed(0), "ms for track", trackId)
      }
    } catch (err) {
      console.warn("[HLS] Cache check failed, regenerating:", err)
      await generateSegments(trackPath, trackId)
    }
  }

  const content = readFileSync(playlistPath, "utf-8")
  const segmentCount = (content.match(/\.ts/g) || []).length
  console.log("[HLS] Serving playlist for track", trackId, "-", segmentCount, "segments")

  return content
}

export function getSegmentPath(
  trackId: string,
  filename: string,
): string | null {
  const dir = trackCacheDir(trackId)

  const resolved = resolveSafe(dir, filename)
  if (!resolved) {
    console.warn("[HLS] Path traversal blocked:", filename, "from dir", dir)
    return null
  }
  if (!existsSync(resolved)) {
    console.warn("[HLS] Segment not found:", resolved, "(filename:", filename, ")")
    return null
  }

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
