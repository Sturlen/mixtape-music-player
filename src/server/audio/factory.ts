import type { AudioMetadataProvider } from "./types"
import { FfprobeMetadataProvider } from "./providers/ffprobe"
import { MediabunnyMetadataProvider } from "./providers/mediabunny"

export function createMetadataProvider(): AudioMetadataProvider {
  if (Bun.which("ffprobe") !== null) {
    return new FfprobeMetadataProvider()
  }

  console.warn(
    "ffprobe not found in PATH, falling back to mediabunny for metadata extraction",
  )
  return new MediabunnyMetadataProvider()
}
