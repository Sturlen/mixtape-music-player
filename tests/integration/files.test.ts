import { describe, test, expect } from "bun:test"
import { createTestApp } from "../unit/test-utils"
import {
  seedArtist,
  seedAlbum,
  seedTrack,
  seedArtAsset,
  seedAudioAsset,
} from "../unit/seed-helpers"
import { mkdtempSync, writeFileSync } from "fs"
import { join } from "path"

describe("GET /api/files/albumart/:albumId", () => {
  test("returns 404 when no art exists", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(
      new Request(
        "http://localhost/api/files/albumart/00000000-0000-0000-0000-000000000000",
      ),
    )
    expect(res.status).toBe(404)
  })

  test("serves art file", async () => {
    const tmpDir = mkdtempSync("/tmp/mixtape-test-")
    const artPath = join(tmpDir, "cover.jpg")
    writeFileSync(artPath, "fake-image-bytes")

    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, {
      stableId: "artist-1",
      name: "Artist",
    })
    const album = await seedAlbum(db, artist.id, {
      stableId: "album-1",
      name: "Album",
    })
    await seedArtAsset(db, album.id, { path: artPath, mimeType: "image/jpeg" })

    const res = await app.handle(
      new Request(`http://localhost/api/files/albumart/${album.id}`),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/jpeg")
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400")
    const body = await res.text()
    expect(body).toBe("fake-image-bytes")
  })
})

describe("GET /api/files/artistart/:artistId", () => {
  test("returns 404 when no art exists", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(
      new Request(
        "http://localhost/api/files/artistart/00000000-0000-0000-0000-000000000000",
      ),
    )
    expect(res.status).toBe(404)
  })

  test("serves artist art file", async () => {
    const tmpDir = mkdtempSync("/tmp/mixtape-test-")
    const artPath = join(tmpDir, "artist.jpg")
    writeFileSync(artPath, "artist-image-bytes")

    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, {
      stableId: "artist-2",
      name: "Artist",
    })
    await seedArtAsset(db, artist.id, {
      entityType: "artist",
      role: "portrait",
      path: artPath,
      mimeType: "image/jpeg",
    })

    const res = await app.handle(
      new Request(`http://localhost/api/files/artistart/${artist.id}`),
    )
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toBe("artist-image-bytes")
  })
})

describe("GET /api/files/track/:trackId", () => {
  test("returns 404 for unknown track", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(
      new Request(
        "http://localhost/api/files/track/00000000-0000-0000-0000-000000000000",
      ),
    )
    expect(res.status).toBe(404)
  })

  test("serves audio file", async () => {
    const tmpDir = mkdtempSync("/tmp/mixtape-test-")
    const audioPath = join(tmpDir, "track.mp3")
    writeFileSync(audioPath, "fake-audio-bytes")

    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, {
      stableId: "artist-3",
      name: "Artist",
    })
    const album = await seedAlbum(db, artist.id, {
      stableId: "album-3",
      name: "Album",
    })
    const track = await seedTrack(db, album.id, {
      stableId: "track-file-1",
      name: "Test Audio",
      path: audioPath,
    })

    const res = await app.handle(
      new Request(`http://localhost/api/files/track/${track.id}`),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toMatch(/audio\/mpeg/)
    const body = await res.text()
    expect(body).toBe("fake-audio-bytes")
  })
})

describe("GET /api/assets", () => {
  test("returns empty list with no assets", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(new Request("http://localhost/api/assets"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assets).toEqual([])
  })

  test("returns seeded audio assets", async () => {
    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, {
      stableId: "artist-4",
      name: "Artist",
    })
    const album = await seedAlbum(db, artist.id, {
      stableId: "album-4",
      name: "Album",
    })
    const track = await seedTrack(db, album.id, {
      stableId: "track-asset-1",
      name: "Track",
    })
    await seedAudioAsset(db, track.id, {
      stableId: "audio-asset-1",
      name: "Asset One",
    })
    await seedAudioAsset(db, track.id, {
      stableId: "audio-asset-2",
      name: "Asset Two",
    })

    const res = await app.handle(new Request("http://localhost/api/assets"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assets).toHaveLength(2)
  })
})

describe("GET /api/assets/:assetId", () => {
  test("returns 404 for unknown asset", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(
      new Request(
        "http://localhost/api/assets/00000000-0000-0000-0000-000000000000",
      ),
    )
    expect(res.status).toBe(404)
  })

  test("serves audio asset file", async () => {
    const tmpDir = mkdtempSync("/tmp/mixtape-test-")
    const audioPath = join(tmpDir, "asset.mp3")
    writeFileSync(audioPath, "fake-asset-bytes")

    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, {
      stableId: "artist-5",
      name: "Artist",
    })
    const album = await seedAlbum(db, artist.id, {
      stableId: "album-5",
      name: "Album",
    })
    const track = await seedTrack(db, album.id, {
      stableId: "track-asset-2",
      name: "Track",
    })
    const asset = await seedAudioAsset(db, track.id, {
      stableId: "audio-asset-serve-1",
      name: "Serve Asset",
      path: audioPath,
    })

    const res = await app.handle(
      new Request(`http://localhost/api/assets/${asset.id}`),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toMatch(/audio\/mpeg/)
    const body = await res.text()
    expect(body).toBe("fake-asset-bytes")
  })
})
