import * as Bun from "bun"
import yaml from "yaml"
import { readdir } from "fs/promises"
import path from "path"
import type { Playlist } from "@/lib/types"

/**
 * Parses playlists from a given directory.
 * @param playlistsPath - The path to the directory containing playlist files.
 * @returns An array of parsed playlists.
 */
export async function parsePlaylists(
  playlistsPath: string,
): Promise<Playlist[]> {
  const playlists: Playlist[] = []

  try {
    // Read all files in the directory
    const files = await readdir(playlistsPath, { withFileTypes: true })

    // Filter for YAML files
    const yamlFiles = files.filter(
      (file) => file.isFile() && file.name.endsWith(".yaml"),
    )

    for (const file of yamlFiles) {
      const filePath = path.join(playlistsPath, file.name)

      try {
        // Read and parse the YAML file
        const rawContent = await Bun.file(filePath).text()
        const content = yaml.parse(rawContent)

        // Validate the parsed content
        if (content.id && content.name && Array.isArray(content.tracks)) {
          playlists.push({
            id: content.id,
            name: content.name,
            tracks: content.tracks,
          })
        } else {
          console.warn(`Invalid playlist structure in file: ${filePath}`)
        }
      } catch (error) {
        console.error(`Failed to parse file: ${filePath}`, error)
      }
    }
  } catch (error) {
    console.error(`Failed to read directory: ${playlistsPath}`, error)
  }

  return playlists
}
