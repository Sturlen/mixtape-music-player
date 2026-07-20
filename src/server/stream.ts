import { $ } from "bun"
import { existsSync, mkdirSync, readdirSync, statSync, rmSync } from "fs"
import { join } from "path"
import { env } from "@/shared/env"
import pLimit from "p-limit"

const BITRATE = env.HLS_BITRATE
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

function cacheDir(): string {
  return join(env.DATA_PATH, "stream-cache")
}

export function getStreamPath(trackId: string): string {
  return join(cacheDir(), `${trackId}.m4a`)
}

async function encodeTrack(
  trackPath: string,
  trackId: string,
): Promise<void> {
  const dir = cacheDir()
  mkdirSync(dir, { recursive: true })
  const outputPath = getStreamPath(trackId)

  if (existsSync(outputPath)) return

  if (!Bun.which("ffmpeg")) {
    throw new Error("ffmpeg not found in PATH")
  }

  const proc =
    await $`ffmpeg -i ${trackPath} -c:a aac -b:a ${BITRATE} -vn -movflags +faststart -loglevel warning -y ${outputPath}`.quiet()

  if (proc.exitCode !== 0) {
    const stderr = proc.stderr.toString()
    console.error("[Stream] FFmpeg failed for track", trackId, ":", stderr)
    throw new Error(`FFmpeg exited with code ${proc.exitCode}`)
  }
}

export async function preencodeTracks(
  tracks: { id: string; path: string }[],
): Promise<void> {
  if (tracks.length === 0) return

  if (!Bun.which("ffmpeg")) {
    console.warn(
      "[Stream] ffmpeg not found in PATH, skipping pre-encode",
    )
    return
  }

  console.log("[Stream] Pre-encoding", tracks.length, "tracks")
  const limit = pLimit(4)
  let completed = 0
  const jobs = tracks.map((t) =>
    limit(async () => {
      try {
        await encodeTrack(t.path, t.id)
        completed++
        if (completed % 100 === 0) {
          console.log(
            "[Stream] Pre-encoded",
            completed,
            "/",
            tracks.length,
          )
        }
      } catch (err) {
        console.error(
          "[Stream] Failed to pre-encode track",
          t.id,
          ":",
          err,
        )
      }
    }),
  )
  await Promise.allSettled(jobs)
  console.log(
    "[Stream] Pre-encoded",
    completed,
    "/",
    tracks.length,
    "tracks",
  )
}

export function cleanupStreamCache(): void {
  const dir = cacheDir()
  if (!existsSync(dir)) return

  const now = Date.now()
  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry)
    try {
      const stats = statSync(entryPath)
      if (stats.isFile() && now - stats.mtimeMs > CACHE_TTL_MS) {
        rmSync(entryPath, { force: true })
      }
    } catch {
      // skip entries we can't stat
    }
  }
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null

export function startStreamCleanup(): void {
  if (cleanupInterval) return
  cleanupStreamCache()
  cleanupInterval = setInterval(cleanupStreamCache, CLEANUP_INTERVAL_MS)
}

export function stopStreamCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}
