import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Track } from "@/lib/types"
import { Duration } from "@/lib/data_type"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function raise(message: string): never {
  throw new Error(message)
}

// TODO: consolidate into Duration.format and remove this wrapper
export function formatTime(s?: number) {
  if (!s || !Number.isFinite(s)) return "0:00"
  return Duration.fromSeconds(s).format()
}

export function compareTracksByNumberName(a: Track, b: Track): number {
  if (a.trackNumber !== undefined && b.trackNumber !== undefined) {
    return a.trackNumber - b.trackNumber
  } else if (a.trackNumber !== undefined) {
    return -1
  } else if (b.trackNumber !== undefined) {
    return 1
  } else {
    return a.name.localeCompare(b.name)
  }
}
