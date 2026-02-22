import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { startServer, stopServer, getBaseUrl } from "./testServer"
import { isSortedAlphabetically, findArtistByNamePattern } from "./fixtures"
import type { Artist } from "@/lib/types"

describe("Artist Endpoints", () => {
  beforeAll(async () => {
    await startServer()
  })

  afterAll(async () => {
    await stopServer()
  })

  test("GET /api/artists returns all artists sorted alphabetically", async () => {
    const res = await fetch(`${getBaseUrl()}/api/artists`)
    const artists: Artist[] = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(artists)).toBe(true)
    expect(artists.length).toBeGreaterThan(0)
    expect(isSortedAlphabetically(artists, (a) => a.name)).toBe(true)
  })

  test("GET /api/artists?q=<query> returns fuzzy search results", async () => {
    const res = await fetch(`${getBaseUrl()}/api/artists?q=kevin`)
    const artists: Artist[] = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(artists)).toBe(true)
    expect(artists.length).toBeGreaterThan(0)
    const kevinArtist = findArtistByNamePattern(artists, /kevin/i)
    expect(kevinArtist).toBeDefined()
  })

  test("GET /api/artists/:id returns artist with albums", async () => {
    const listRes = await fetch(`${getBaseUrl()}/api/artists`)
    const artists: Artist[] = await listRes.json()
    const firstArtist = artists[0]!

    const res = await fetch(`${getBaseUrl()}/api/artists/${firstArtist.id}`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.artist).toBeDefined()
    expect(data.artist.id).toBe(firstArtist.id)
    expect(data.artist.name).toBe(firstArtist.name)
    expect(Array.isArray(data.artist.albums)).toBe(true)
  })

  test("GET /api/artists/:id returns empty object for unknown artist", async () => {
    const res = await fetch(`${getBaseUrl()}/api/artists/unknown-artist-id`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.artist).toBeUndefined()
  })
})
