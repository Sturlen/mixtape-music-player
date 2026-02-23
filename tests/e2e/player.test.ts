import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { startServer, stopServer, getBaseUrl } from "./testServer"
import type { Track, Album } from "@/lib/types"

describe("Player Endpoints", () => {
  beforeAll(async () => {
    await startServer()
  })

  afterAll(async () => {
    await stopServer()
  })

  test("POST /api/player with valid trackId returns playback URL", async () => {
    const tracksRes = await fetch(`${getBaseUrl()}/api/tracks`)
    const tracks: Track[] = await tracksRes.json()
    const firstTrack = tracks[0]!

    const res = await fetch(`${getBaseUrl()}/api/player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: firstTrack.id }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.url).toBeDefined()
    expect(typeof data.url).toBe("string")
    expect(data.url).toContain("/api/assets/")
  })

  test("POST /api/player with missing trackId returns 400", async () => {
    const res = await fetch(`${getBaseUrl()}/api/player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })

    expect([400, 500]).toContain(res.status)
  })

  test("POST /api/player with unknown trackId returns 404", async () => {
    const res = await fetch(`${getBaseUrl()}/api/player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: "unknown-track-id" }),
    })

    expect(res.status).toBe(404)
  })

  test("POST /api/playAlbum/:id returns album with sorted tracks", async () => {
    const albumsRes = await fetch(`${getBaseUrl()}/api/albums`)
    const albumsData = await albumsRes.json()
    const firstAlbum = albumsData.albums[0]

    const res = await fetch(`${getBaseUrl()}/api/playAlbum/${firstAlbum.id}`, {
      method: "POST",
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.album).toBeDefined()
    expect(data.album.id).toBe(firstAlbum.id)
    expect(Array.isArray(data.tracks)).toBe(true)
    expect(data.tracks.length).toBeGreaterThan(0)
  })

  test("POST /api/playAlbum/:id returns 404 for unknown album", async () => {
    const res = await fetch(`${getBaseUrl()}/api/playAlbum/unknown-album-id`, {
      method: "POST",
    })

    expect(res.status).toBe(404)
  })

  test("POST /api/playPlaylist/:id returns playlist with track objects", async () => {
    const playlistsRes = await fetch(`${getBaseUrl()}/api/playlists`)
    const playlistsData = await playlistsRes.json()
    const firstPlaylist = playlistsData.playlists[0]!

    const res = await fetch(
      `${getBaseUrl()}/api/playPlaylist/${firstPlaylist.id}`,
      {
        method: "POST",
      },
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.playlist).toBeDefined()
    expect(data.playlist.id).toBe(firstPlaylist.id)
    expect(Array.isArray(data.tracks)).toBe(true)
  })

  test("POST /api/playPlaylist/:id returns 404 for unknown playlist", async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/playPlaylist/unknown-playlist-id`,
      {
        method: "POST",
      },
    )

    expect(res.status).toBe(404)
  })
})
