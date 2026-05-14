import { createMetadataProvider } from "../src/server/audio"
import type { AudioMetadataProvider } from "../src/server/audio"

function assertServerRuntime(): void {
  if (typeof window !== "undefined") {
    console.error("Audio file inspection is not supported in a browser.")
    process.exitCode = 1
  }
}

export async function main(args: string[]): Promise<void> {
  assertServerRuntime()

  const filePath = args[0]

  if (!filePath) {
    console.error(
      "Usage: bun run scripts/audio-file-info.ts <audio-file-path>",
    )
    process.exitCode = 1
    return
  }

  const provider: AudioMetadataProvider = createMetadataProvider()
  const startedAt = performance.now()

  try {
    const info = await provider.getMetadata(filePath)
    const elapsedMs = performance.now() - startedAt

    console.log(
      JSON.stringify(
        {
          path: info.path,
          size: info.size.toString(),
          durationSeconds: info.durationSeconds.toJSON(),
          provider: info.provider,
          trackName: info.trackName,
          artistName: info.artistName,
          albumName: info.albumName,
          trackNumber: info.trackNumber,
          elapsedMs: Number(elapsedMs.toFixed(2)),
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}

if (import.meta.main) {
  main(process.argv.slice(2))
}
