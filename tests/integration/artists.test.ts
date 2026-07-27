import { describe, test, expect } from "bun:test"
import { createTestApp } from "../unit/test-utils"
import { seedArtist, seedAlbum } from "../unit/seed-helpers"

describe("GET /api/artists", () => {
  test("returns empty list with no artists", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(new Request("http://localhost/api/artists"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  test("returns seeded artists sorted by name", async () => {
    const { app, db } = await createTestApp()
    await seedArtist(db, { stableId: "z-artist", name: "Zed" })
    await seedArtist(db, { stableId: "a-artist", name: "Alpha" })
    const res = await app.handle(new Request("http://localhost/api/artists"))
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0]!.name).toBe("Alpha")
    expect(body[1]!.name).toBe("Zed")
  })

  test("search by name", async () => {
    const { app, db, rebuildIndexes } = await createTestApp()
    await seedArtist(db, { stableId: "metal", name: "Metallica" })
    await seedArtist(db, { stableId: "doors", name: "The Doors" })
    await rebuildIndexes()
    const res = await app.handle(new Request("http://localhost/api/artists?q=The+Doors"))
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]!.name).toBe("The Doors")
  })
})

describe("GET /api/artists/:artistId", () => {
  test("returns artist with albums", async () => {
    const { app, db } = await createTestApp()
    const artist = await seedArtist(db, { stableId: "the-id", name: "Test Artist" })
    const album = await seedAlbum(db, artist.id, { name: "Test Album" })
    const res = await app.handle(new Request(`http://localhost/api/artists/${artist.id}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.artist).not.toBeNull()
    expect(body.artist.name).toBe("Test Artist")
    expect(body.artist.albums).toHaveLength(1)
    expect(body.artist.albums[0]!.name).toBe("Test Album")
  })

  test("returns null for unknown artist", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(new Request("http://localhost/api/artists/00000000-0000-0000-0000-000000000000"))
    const body = await res.json()
    expect(body.artist).toBeNull()
  })
})
