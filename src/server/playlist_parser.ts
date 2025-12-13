import * as Bun from "bun"
import { parse, stringify } from "yaml"
import { readdir, writeFile, unlink } from "fs/promises"
import path from "path"
import type { Playlist } from "@/lib/types"

// Helper to generate human-readable filename from playlist name
function generateFilename(name: string): string {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")}.yaml`
}

// Helper to find file by ID by scanning all files
async function findFileById(
  playlists_path: string,
  playlistId: string,
): Promise<string | null> {
  const files = await readdir(playlists_path)
  for (const filename of files) {
    if (!filename.endsWith(".yaml")) continue

    try {
      const content = parse(
        await Bun.file(path.join(playlists_path, filename)).text(),
      )
      if (content.id === playlistId) {
        return filename
      }
    } catch {
      // Skip invalid files
    }
  }
  return null
}

export async function parsePlaylists(playlists_path: string) {
  const playlist_files = await readdir(playlists_path, {
    recursive: false,
    withFileTypes: true,
  })
  const playlists: Playlist[] = []

  const playlist_entries = playlist_files.filter(
    (x) => x.isFile() && x.name.endsWith(".yaml"),
  )
  for (const ent of playlist_entries) {
    try {
      const content = parse(
        await Bun.file(path.join(playlists_path, ent.name)).text(),
      )
      if (content.id && content.name) {
        playlists.push({
          id: content.id,
          name: content.name,
          tracks: content.tracks || [],
        })
      }
    } catch (error) {
      console.warn(`Failed to parse playlist file ${ent.name}:`, error)
    }
  }
  return playlists
}

export async function savePlaylist(playlist: Playlist, playlists_path: string) {
  // Find existing file by ID
  const existingFilename = await findFileById(playlists_path, playlist.id)

  // Generate new human-readable filename
  const newFilename = generateFilename(playlist.name)
  const filepath = path.join(playlists_path, newFilename)

  const yamlContent = stringify({
    name: playlist.name,
    id: playlist.id,
    tracks: playlist.tracks,
  })

  await writeFile(filepath, yamlContent, "utf8")

  // Delete old file if it exists and has different name
  if (existingFilename && existingFilename !== newFilename) {
    try {
      await unlink(path.join(playlists_path, existingFilename))
    } catch (error) {
      console.warn(
        `Failed to delete old playlist file ${existingFilename}:`,
        error,
      )
    }
  }

  return playlist
}

export async function deletePlaylist(
  playlistId: string,
  playlists_path: string,
) {
  const filename = await findFileById(playlists_path, playlistId)

  if (!filename) {
    throw new Error(`Playlist with id ${playlistId} not found`)
  }

  const filepath = path.join(playlists_path, filename)

  try {
    // Read file first to get playlist data to return
    const content = parse(await Bun.file(filepath).text())
    await unlink(filepath)
    return {
      id: content.id,
      name: content.name,
      tracks: content.tracks,
    }
  } catch (error) {
    throw new Error(`Failed to delete playlist with id ${playlistId}`)
  }
}

export function generatePlaylistId(): string {
  return `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
