import path from "node:path"
import { $ } from "bun"
import z from "zod"
import { DataSize, Duration } from "../../../lib/data_type"
import type { AudioMetadata, AudioMetadataProvider } from "../types"
import { AudioError } from "../types"

const ffprobe_format_schema = z.object({
  format: z.object({
    duration: z.string(),
    size: z.string(),
    tags: z
      .object({
        title: z.string().optional(),
        TITLE: z.string().optional(),
        artist: z.string().optional(),
        ARTIST: z.string().optional(),
        album: z.string().optional(),
        ALBUM: z.string().optional(),
        album_artist: z.string().optional(),
        albumArtist: z.string().optional(),
        TPE2: z.string().optional(),
        track: z.string().optional(),
        trackNumber: z.string().optional(),
        date: z.string().optional(),
        DATE: z.string().optional(),
      })
      .optional(),
  }),
})

function tagValue(
  tags: Record<string, string | undefined> | undefined,
  ...keys: string[]
): string | undefined {
  if (!tags) return undefined
  for (const key of keys) {
    const val = tags[key]
    if (val) return val
  }
}

function parseYear(val: string | undefined): number | undefined {
  if (!val) return undefined
  const match = val.match(/\b(\d{4})\b/)
  if (!match) return undefined
  return Number.parseInt(match[1]!, 10)
}

function parseTrackNumber(val: string | undefined): number | undefined {
  if (!val) return undefined
  const n = Number.parseInt(val, 10)
  return Number.isNaN(n) ? undefined : n
}

export class FfprobeMetadataProvider implements AudioMetadataProvider {
  readonly name = "ffprobe"

  async getMetadata(filePath: string): Promise<AudioMetadata> {
    const normalizedPath = path.normalize(filePath).replace(/\\/g, "/")
    const file = Bun.file(normalizedPath)

    if (!(await file.exists())) {
      throw new AudioError(`File not found: ${normalizedPath}`, this.name)
    }

    const proc =
      await $`ffprobe -v quiet -print_format json -show_format ${normalizedPath}`.quiet()

    const out = ffprobe_format_schema.safeParse(
      JSON.parse(proc.stdout.toString()),
    )

    if (!out.success) {
      throw new AudioError(
        `Failed to parse ffprobe output: ${proc.stdout.toString()}`,
        this.name,
      )
    }

    const tags = out.data.format.tags

    return {
      path: normalizedPath,
      size: DataSize.fromBytes(file.size),
      durationSeconds: Duration.fromSeconds(
        Number.parseFloat(out.data.format.duration),
      ),
      provider: this.name,
      trackName: tagValue(tags, "title", "TITLE"),
      artistName: tagValue(tags, "artist", "ARTIST"),
      albumArtistName: tagValue(tags, "album_artist", "albumArtist", "TPE2"),
      albumName: tagValue(tags, "album", "ALBUM"),
      trackNumber: parseTrackNumber(tagValue(tags, "track", "trackNumber")),
      year: parseYear(tagValue(tags, "date", "DATE")),
    }
  }
}
