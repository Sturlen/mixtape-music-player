import { describe, test, expect } from "bun:test"
import { createTestApp } from "../unit/test-utils"
import { seedArtist, seedAlbum, seedArtAsset } from "../unit/seed-helpers"
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
