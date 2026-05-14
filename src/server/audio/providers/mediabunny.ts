import path from "node:path"
import { ALL_FORMATS, BlobSource, Input } from "mediabunny"
import { DataSize, Duration } from "../../../lib/data_type"
import type { AudioMetadata, AudioMetadataProvider } from "../types"
import { AudioError } from "../types"

export class MediabunnyMetadataProvider implements AudioMetadataProvider {
  readonly name = "mediabunny"

  async getMetadata(filePath: string): Promise<AudioMetadata> {
    const normalizedPath = path.normalize(filePath).replace(/\\/g, "/")
    const file = Bun.file(normalizedPath)

    if (!(await file.exists())) {
      throw new AudioError(`File not found: ${normalizedPath}`, this.name)
    }

    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS,
    })

    const [duration, metadata] = await Promise.all([
      input.computeDuration(),
      input.getMetadataTags(),
    ])

    return {
      path: normalizedPath,
      size: DataSize.fromBytes(file.size),
      durationSeconds: Duration.fromSeconds(duration),
      provider: this.name,
      trackName: metadata.title || undefined,
      artistName: metadata.artist || undefined,
      albumArtistName: metadata.albumArtist || undefined,
      albumName: metadata.album || undefined,
      trackNumber: metadata.trackNumber || undefined,
    }
  }
}
