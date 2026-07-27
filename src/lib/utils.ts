import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Track } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function raise(message: string): never {
  throw new Error(message)
}

export function formatTime(s?: number) {
  if (!s || !Number.isFinite(s)) return "0:00"
  const totalSeconds = Math.floor(s)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`
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
