import { DataSize, Duration } from "../../lib/data_type"

export interface AudioMetadata {
  path: string
  size: DataSize
  durationSeconds: Duration
  provider: string
  trackName?: string
  artistName?: string
  albumArtistName?: string
  albumName?: string
  trackNumber?: number
}

export interface AudioMetadataProvider {
  readonly name: string
  getMetadata(filePath: string): Promise<AudioMetadata>
}

export class AudioError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
  ) {
    super(message)
  }
}
