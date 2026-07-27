import { describe, test, expect } from "bun:test"
import { createTestApp } from "../unit/test-utils"
import { seedArtist, seedAlbum, seedTrack } from "../unit/seed-helpers"

describe("GET /api/albums", () => {
  test("returns empty list with no albums", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(new Request("http://localhost/api/albums"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.albums).toEqual([])
  })

  test("returns seeded albums with artist names", async () => {
    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, { stableId: "artist-1", name: "Test Artist" })
    await seedAlbum(db, artist.id, { stableId: "album-1", name: "Alpha Album" })
    await seedAlbum(db, artist.id, { stableId: "album-2", name: "Beta Album" })
    const res = await app.handle(new Request("http://localhost/api/albums"))
    const body = await res.json()
    expect(body.albums).toHaveLength(2)
    expect(body.albums[0]!.name).toBe("Alpha Album")
    expect(body.albums[0]!.artistName).toBe("Test Artist")
  })

  test("search by name", async () => {
    const { app, db, rebuildIndexes } = await createTestApp()
    const artist = await seedArtist(db, { stableId: "artist-1", name: "Artist" })
    await seedAlbum(db, artist.id, { stableId: "a1", name: "Greatest Hits" })
    await seedAlbum(db, artist.id, { stableId: "a2", name: "Greatest Misses" })
    await seedAlbum(db, artist.id, { stableId: "a3", name: "Something Else" })
    await rebuildIndexes()
    const res = await app.handle(new Request("http://localhost/api/albums?q=Greatest"))
    const body = await res.json()
    expect(body.albums).toHaveLength(2)
  })
})

describe("GET /api/albums/:albumId", () => {
  test("returns album with tracks sorted by number", async () => {
    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, { stableId: "artist-1", name: "Artist" })
    const album = await seedAlbum(db, artist.id, { stableId: "album-1", name: "Album" })
    await seedTrack(db, album.id, { stableId: "t2", name: "Track B", trackNumber: 2 })
    await seedTrack(db, album.id, { stableId: "t1", name: "Track A", trackNumber: 1 })
    const res = await app.handle(new Request(`http://localhost/api/albums/${album.id}`))
    const body = await res.json()
    expect(body.album).not.toBeNull()
    expect(body.album.name).toBe("Album")
    expect(body.album.artistName).toBe("Artist")
    expect(body.album.tracks).toHaveLength(2)
    expect(body.album.tracks[0]!.trackNumber).toBe(1)
    expect(body.album.tracks[1]!.trackNumber).toBe(2)
  })

  test("returns null for unknown album", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(new Request("http://localhost/api/albums/00000000-0000-0000-0000-000000000000"))
    const body = await res.json()
    expect(body.album).toBeNull()
  })
})
