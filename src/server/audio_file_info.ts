import path from "node:path"
import { $ } from "bun"
import { ALL_FORMATS, BlobSource, Input } from "mediabunny"

import { DataSize } from "../lib/data_type"
import z from "zod"

export type AudioInfoProvider = "mediabunny" | "ffprobe"

export type AudioInfo = {
  path: string
  size: DataSize
  durationSeconds: number
  provider: AudioInfoProvider
  trackName?: string
  artistName?: string
  albumName?: string
  trackNumber?: number
}

function assertServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new Error("Audio file inspection is not supported in a browser.")
  }
}

async function resolveInputFile(filePath: string): Promise<{
  normalizedPath: string
  file: Bun.BunFile
}> {
  assertServerRuntime()

  const normalizedPath = path.normalize(filePath).replace(/\\/g, "/")
  const file = Bun.file(normalizedPath)

  if (!(await file.exists())) {
    throw new Error(`File not found: ${normalizedPath}`)
  }

  return {
    normalizedPath,
    file,
  }
}

export const ffmpeg_format_schema = z.object({
  format: z.object({
    filename: z.string(),
    format_name: z.string(),
    start_time: z.string(),
    duration: z.string(),
    size: z.string(),
    bit_rate: z.string(),
    tags: z.object({
      TITLE: z.string().optional(),
      ARTIST: z.string().optional(),
      DATE: z.string().optional(),
      COMMENT: z.string().optional(),
      ALBUM: z.string().optional(),
      track: z.string().optional(),
      album_artist: z.string().optional(),
    }),
  }),
})

export async function getAudioInfo(
  filePath: string,
  provider: AudioInfoProvider = "mediabunny",
) {
  const { normalizedPath, file } = await resolveInputFile(filePath)

  const info = {
    provider,
    path: normalizedPath,
    size: DataSize.fromBytes(file.size),
  } as AudioInfo

  if (provider === "mediabunny") {
    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS,
    })

    info.durationSeconds = await input.computeDuration()
    const metadata = await input.getMetadataTags()

    info.trackName = metadata.title
    info.artistName = metadata.artist || metadata.albumArtist
    info.albumName = metadata.album
    info.trackNumber = metadata.trackNumber
  } else {
    const proc =
      await $`ffprobe -v quiet -print_format json -show_format ${normalizedPath}`.quiet()

    // await $`ffprobe -print_format json -show_entries format=duration,tags ${normalizedPath}`.quiet()
    // untested thumbnail extraction

    // console.log("ffprobe output:", proc.stdout.toString())
    // `ffmpeg -i input.flac -map 0:v -codec copy cover.jpg`

    const out = ffmpeg_format_schema.safeParse(
      JSON.parse(proc.stdout.toString()),
    )

    if (!out.success) {
      console.error("Failed to parse ffprobe output:", proc.stdout.toString())
      throw new Error(
        `Failed to parse ffprobe output for file: ${normalizedPath}`,
      )
    }

    info.durationSeconds = Number.parseFloat(out.data.format.duration)

    if (!Number.isFinite(info.durationSeconds)) {
      throw new Error(
        `Failed to parse ffprobe duration for file: ${normalizedPath}`,
      )
    }
  }

  return info
}

export async function main(args: string[]): Promise<void> {
  const filePath = args[0]

  if (!filePath) {
    console.error(
      "Usage: bun run <script> <audio-file-path> [mediabunny|ffprobe]",
    )
    process.exitCode = 1
    return
  }

  const providerArg = args[1]
  const provider = providerArg === "ffprobe" ? "ffprobe" : "mediabunny"

  const startedAt = performance.now()
  const info = await getAudioInfo(filePath, provider)
  const elapsedMs = performance.now() - startedAt

  console.log(
    JSON.stringify(
      {
        ...info,
        size: info.size.toString(),
        elapsedMs: Number(elapsedMs.toFixed(2)),
      },
      null,
      2,
    ),
  )
}

if (import.meta.main) {
  try {
    await main(process.argv.slice(2))
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}
