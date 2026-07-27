import { describe, test, expect } from "bun:test"
import { createTestApp } from "../unit/test-utils"
import { seedArtist, seedAlbum, seedTrack } from "../unit/seed-helpers"

describe("GET /api/tracks", () => {
  test("returns empty list with no tracks", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(new Request("http://localhost/api/tracks"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  test("returns all tracks", async () => {
    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, { stableId: "artist-1", name: "Artist" })
    const album = await seedAlbum(db, artist.id, { stableId: "album-1", name: "Album" })
    await seedTrack(db, album.id, { stableId: "t1", name: "Track One" })
    await seedTrack(db, album.id, { stableId: "t2", name: "Track Two" })
    const res = await app.handle(new Request("http://localhost/api/tracks"))
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0]!.name).toBe("Track One")
    expect(body[1]!.name).toBe("Track Two")
  })
})

describe("GET /api/tracks/:trackId", () => {
  test("returns track by id", async () => {
    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, { stableId: "artist-1", name: "Artist" })
    const album = await seedAlbum(db, artist.id, { stableId: "album-1", name: "Album" })
    const track = await seedTrack(db, album.id, { stableId: "t1", name: "My Track" })
    const res = await app.handle(new Request(`http://localhost/api/tracks/${track.id}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body?.name).toBe("My Track")
    expect(body?.albumId).toBe(album.id)
  })

  test("returns null for unknown track", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(new Request("http://localhost/api/tracks/00000000-0000-0000-0000-000000000000"))
    const text = await res.text()
    // Elysia serializes null returns as empty body
    expect(text === "" || text === "null").toBe(true)
  })
})
