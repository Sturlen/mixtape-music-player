import { readdir } from "fs/promises"
import path from "path"

export type FileInfo = {
  path: string
}

export type ScanResult = {
  audioFiles: FileInfo[]
  artByDir: Map<string, string>
}

async function walk(dir: string, files: FileInfo[], artByDir: Map<string, string>) {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      const subArt = new Map<string, string>()
      await walk(fullPath, files, subArt)

      for (const [d, img] of subArt) {
        artByDir.set(d, img)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if ([".mp3", ".flac", ".ogg", ".wav", ".m4a", ".aac", ".wma"].includes(ext)) {
        files.push({ path: fullPath })
      } else if ([".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp"].includes(ext) && !entry.name.startsWith(".")) {
        const dirPath = path.dirname(fullPath)
        if (!artByDir.has(dirPath)) {
          artByDir.set(dirPath, fullPath)
        }
      }
    }
  }
}

export async function scan(rootPath: string): Promise<ScanResult> {
  const audioFiles: FileInfo[] = []
  const artByDir = new Map<string, string>()
  await walk(rootPath, audioFiles, artByDir)
  return { audioFiles, artByDir }
}
