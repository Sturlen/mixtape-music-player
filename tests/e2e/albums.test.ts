import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { startServer, stopServer, getBaseUrl } from "./testServer"
import { isSortedAlphabetically, isSortedByTrackNumber } from "./fixtures"
import type { Album } from "@/lib/types"

describe("Album Endpoints", () => {
  beforeAll(async () => {
    await startServer()
  })

  afterAll(async () => {
    await stopServer()
  })

  test("GET /api/albums returns all albums sorted alphabetically", async () => {
    const res = await fetch(`${getBaseUrl()}/api/albums`)
    const data = await res.json()
    const albums: Album[] = data.albums

    expect(res.status).toBe(200)
    expect(Array.isArray(albums)).toBe(true)
    expect(albums.length).toBeGreaterThan(0)
    expect(isSortedAlphabetically(albums, (a) => a.name)).toBe(true)
  })

  test("GET /api/albums?q=<query> returns fuzzy search results", async () => {
    const res = await fetch(`${getBaseUrl()}/api/albums?q=royalty`)
    const data = await res.json()
    const albums: Album[] = data.albums

    expect(res.status).toBe(200)
    expect(Array.isArray(albums)).toBe(true)
    expect(albums.length).toBeGreaterThan(0)
    const royaltyAlbum = albums.find((a) => /royalty/i.test(a.name))
    expect(royaltyAlbum).toBeDefined()
  })

  test("GET /api/albums/:id returns album with sorted tracks", async () => {
    const listRes = await fetch(`${getBaseUrl()}/api/albums`)
    const listData = await listRes.json()
    const firstAlbum = listData.albums[0]

    const res = await fetch(`${getBaseUrl()}/api/albums/${firstAlbum.id}`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.album).toBeDefined()
    expect(data.album.id).toBe(firstAlbum.id)
    expect(data.album.name).toBe(firstAlbum.name)
    expect(Array.isArray(data.album.tracks)).toBe(true)
    expect(isSortedByTrackNumber(data.album.tracks)).toBe(true)
  })

  test("GET /api/albums/:id returns empty object for unknown album", async () => {
    const res = await fetch(`${getBaseUrl()}/api/albums/unknown-album-id`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.album).toBeUndefined()
  })
})
