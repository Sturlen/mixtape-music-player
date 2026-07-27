import { describe, test, expect } from "bun:test"
import { createTestApp, signTestToken } from "../unit/test-utils"
import {
  seedArtist,
  seedAlbum,
  seedTrack,
  seedPlaylist,
} from "../unit/seed-helpers"
import { audioAssets } from "@/db/schema"

async function seedAudioAsset(db: any, trackId: string, overrides?: any) {
  const [row] = await db
    .insert(audioAssets)
    .values({
      stableId: `asset-${trackId}`,
      parentId: trackId,
      path: "/dev/null/test.mp3",
      name: "test.mp3",
      filetype: "audio",
      fileExt: ".mp3",
      duration: 180,
      ...overrides,
    })
    .returning()
  return row!
}

describe("POST /api/player", () => {
  test("returns playback URL for valid track", async () => {
    const { app, db } = await createTestApp()
    const artist = await seedArtist(db)
    const album = await seedAlbum(db, artist.id)
    const track = await seedTrack(db, album.id)
    await seedAudioAsset(db, track.id)
    const token = await signTestToken()

    const res = await app.handle(
      new Request("http://localhost/api/player", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trackId: track.id }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("url")
    expect(body.url).toContain(`/api/assets/`)
  })

  test("returns 422 for missing trackId", async () => {
    const { app } = await createTestApp()
    const token = await signTestToken()
    const res = await app.handle(
      new Request("http://localhost/api/player", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    )
    expect(res.status).toBe(422)
  })

  test("returns 404 for unknown trackId", async () => {
    const { app } = await createTestApp()
    const token = await signTestToken()
    const res = await app.handle(
      new Request("http://localhost/api/player", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackId: "00000000-0000-0000-0000-000000000000",
        }),
      }),
    )
    expect(res.status).toBe(404)
  })

  test("returns 404 when track has no audio asset", async () => {
    const { app, db } = await createTestApp()
    const artist = await seedArtist(db)
    const album = await seedAlbum(db, artist.id)
    const track = await seedTrack(db, album.id)
    const token = await signTestToken()
    const res = await app.handle(
      new Request("http://localhost/api/player", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trackId: track.id }),
      }),
    )
    expect(res.status).toBe(404)
  })

  test("returns 401 without auth", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(
      new Request("http://localhost/api/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: "anything" }),
      }),
    )
    expect(res.status).toBe(401)
  })
})

describe("POST /api/playAlbum/:albumId", () => {
  test("returns album with tracks", async () => {
    const { app, db } = await createTestApp()
    const artist = await seedArtist(db)
    const album = await seedAlbum(db, artist.id)
    await seedTrack(db, album.id, { trackNumber: 1 })
    await seedTrack(db, album.id, { trackNumber: 2 })
    const token = await signTestToken()
    const res = await app.handle(
      new Request(`http://localhost/api/playAlbum/${album.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.album.id).toBe(album.id)
    expect(body.tracks).toHaveLength(2)
  })

  test("returns 404 for unknown album", async () => {
    const { app } = await createTestApp()
    const token = await signTestToken()
    const res = await app.handle(
      new Request(
        "http://localhost/api/playAlbum/00000000-0000-0000-0000-000000000000",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
    )
    expect(res.status).toBe(404)
  })

  test("returns 401 without auth", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(
      new Request("http://localhost/api/playAlbum/anything", {
        method: "POST",
      }),
    )
    expect(res.status).toBe(401)
  })
})

describe("POST /api/playPlaylist/:playlistId", () => {
  test("returns playlist", async () => {
    const { app, db } = await createTestApp()
    const playlist = await seedPlaylist(db, { name: "Test Playlist" })
    const token = await signTestToken()
    const res = await app.handle(
      new Request(`http://localhost/api/playPlaylist/${playlist.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.playlist.id).toBe(playlist.id)
    expect(body.playlist.name).toBe("Test Playlist")
  })

  test("returns 404 for unknown playlist", async () => {
    const { app } = await createTestApp()
    const token = await signTestToken()
    const res = await app.handle(
      new Request(
        "http://localhost/api/playPlaylist/00000000-0000-0000-0000-000000000000",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
    )
    expect(res.status).toBe(404)
  })
})
