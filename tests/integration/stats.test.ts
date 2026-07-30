import { describe, test, expect } from "bun:test"
import { createTestApp } from "../unit/test-utils"
import {
  seedArtist,
  seedAlbum,
  seedTrack,
  seedArtAsset,
  seedPlaylist,
  seedSource,
} from "../unit/seed-helpers"
import { mkdtempSync, writeFileSync } from "fs"
import { join } from "path"

describe("GET /api/stats", () => {
  test("returns zero counts with empty database", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(new Request("http://localhost/api/stats"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      artists: 0,
      albums: 0,
      tracks: 0,
      artAssets: 0,
      audioAssets: 0,
      playlists: 0,
      libraries: 0,
    })
  })

  test("returns correct counts with seeded data", async () => {
    const { app, db } = await createTestApp()
    const artist1 = await seedArtist(db, {
      stableId: "artist-1",
      name: "Artist One",
    })
    const artist2 = await seedArtist(db, {
      stableId: "artist-2",
      name: "Artist Two",
    })
    const album1 = await seedAlbum(db, artist1.id, {
      stableId: "album-1",
      name: "Album One",
    })
    const album2 = await seedAlbum(db, artist2.id, {
      stableId: "album-2",
      name: "Album Two",
    })
    await seedTrack(db, album1.id, { stableId: "track-1", name: "Track A" })
    await seedTrack(db, album1.id, { stableId: "track-2", name: "Track B" })
    await seedTrack(db, album2.id, { stableId: "track-3", name: "Track C" })

    const tmpDir = mkdtempSync("/tmp/mixtape-test-")
    const artPath = join(tmpDir, "cover.jpg")
    writeFileSync(artPath, "fake-image-bytes")
    await seedArtAsset(db, album1.id, {
      path: artPath,
      mimeType: "image/jpeg",
    })

    await seedPlaylist(db, { stableId: "playlist-1", name: "Favorites" })
    await seedSource(db, { name: "Music" })

    const res = await app.handle(new Request("http://localhost/api/stats"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      artists: 2,
      albums: 2,
      tracks: 3,
      artAssets: 1,
      audioAssets: 0,
      playlists: 1,
      libraries: 1,
    })
  })
})
