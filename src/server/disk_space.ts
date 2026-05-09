import { statfs } from "node:fs/promises"
import type { PathLike } from "node:fs"
import { DataSize } from "../lib/data_type"

async function checkDiskSpace(path: PathLike = ".") {
  if (typeof window !== "undefined") {
    // In a browser environment, we can't check disk space directly.
    // We can return a placeholder or throw an error.
    throw new Error(
      "Disk space check is not supported in a browser environment.",
    )
  }
  const stats = await statfs(path)
  // stats.bavail: Available blocks
  // stats.bsize: Block size
  return DataSize.fromBytes(stats.bavail * stats.bsize)
}

if (import.meta.main) {
  try {
    console.log(`Available space: ${await checkDiskSpace()}`)
  } catch (error) {
    console.error("Error:", error)
  }
}
