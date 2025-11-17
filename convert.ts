import { readdir } from "node:fs/promises"
import { join, extname, basename } from "node:path"
import { $ } from "bun"

async function findFlacFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentPath: string) {
    const entries = await readdir(currentPath, {
      withFileTypes: true,
    })

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (extname(entry.name).toLowerCase() === ".flac") {
        files.push(fullPath)
      }
    }
  }

  await walk(dir)
  return files
}

async function mp3Exists(flacFile: string): Promise<boolean> {
  const mp3File = flacFile.replace(/\.flac$/i, ".mp3")
  return await Bun.file(mp3File).exists()
}

async function convertToMp3(inputFile: string, dryRun: boolean) {
  const outputFile = inputFile.replace(/\.flac$/i, ".mp3")

  try {
    if (!dryRun) {
      await $`ffmpeg -i ${inputFile} -q:a 0 ${outputFile}`.quiet()
    }
    console.log(`✓ ${basename(inputFile)}`)
  } catch (error) {
    console.error(`✗ ${basename(inputFile)}: ${(error as Error).message}`)
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const argv = process.argv.slice(2)
  console.log("argv", argv)
  const inputDir = argv.find((arg) => !arg.startsWith("--")) || "./music"

  console.log(`📁 Scanning: ${inputDir}${dryRun ? " [DRY RUN]" : ""}`)

  const flacFiles = await findFlacFiles(inputDir)

  if (flacFiles.length === 0) {
    console.log("No FLAC files found.")
    return
  }

  const toConvert: string[] = []

  for (const flacFile of flacFiles) {
    const exists = await mp3Exists(flacFile)
    if (!exists) {
      toConvert.push(flacFile)
    }
  }

  console.log(
    `Found ${flacFiles.length} FLAC files (${toConvert.length} need conversion)\n`,
  )

  if (toConvert.length === 0) {
    console.log("✅ All tracks already converted!")
    return
  }

  for (const flacFile of toConvert) {
    await convertToMp3(flacFile, dryRun)
  }

  console.log(`\n✅ ${dryRun ? "Dry run" : "Conversion"} complete!`)
}

await main()
