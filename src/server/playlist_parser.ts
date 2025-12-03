import * as Bun from "bun"
import { parse } from "yaml"
import { readdir } from "fs/promises"
import path from "path"

interface Playlist {
  name: string
  id: string
  tracks: Array<{ id: string; name: string }>
}

export async function parsePlaylists(playlists_path: string) {
  const playlist_files = await readdir(playlists_path, {
    recursive: false,
    withFileTypes: true,
  })
  const playlists: Playlist[] = []

  const playlist_entries = playlist_files.filter((x) => x.isFile())
  for (const ent of playlist_entries) {
    const content = Bun.YAML.parse(
      await Bun.file(path.join(playlists_path, ent.name)).text(),
    )
    playlists.push({
      id: content.id,
      name: content.name,
      tracks: content.tracks,
    })
  }
  return playlists
}
