import path from "path"
import { describe, test, expect } from "bun:test"
import { parsePlaylists } from "@/server/new_playlist_parser"

describe("parsePlaylists", () => {
  const playlistsDir = path.resolve(__dirname, "../data/playlists")

  test("should parse valid playlists", async () => {
    const playlists = await parsePlaylists(playlistsDir)

    expect(playlists).toEqual([
      {
        id: "playlist_1234567890abcdef",
        name: "My Awesome Mixtape",
        tracks: [
          { id: "trackeb4d5eaa2d900185", name: "A Proper Story" },
          { id: "track692bf6b99ac61a02", name: "Stained Glass" },
          { id: "trackedb22e9831c7d490", name: "Terminal March" },
        ],
      },
    ])
  })

  test("should handle invalid files gracefully", async () => {
    const playlists = await parsePlaylists(playlistsDir)

    // Assuming invalid files are ignored
    expect(playlists).not.toContainEqual(
      expect.objectContaining({ id: undefined }),
    )
  })

  test("should return an empty array for an empty directory", async () => {
    const emptyDir = path.resolve(__dirname, "../data/empty")
    const playlists = await parsePlaylists(emptyDir)

    expect(playlists).toHaveLength(0)
  })
})
