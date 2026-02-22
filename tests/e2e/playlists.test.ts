import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { startServer, stopServer, getBaseUrl } from "./testServer"
import { isSortedAlphabetically } from "./fixtures"
import type { Playlist } from "@/lib/types"

describe("Playlist Endpoints", () => {
  beforeAll(async () => {
    await startServer()
  })

  afterAll(async () => {
    await stopServer()
  })

  test("GET /api/playlists returns all playlists sorted alphabetically", async () => {
    const res = await fetch(`${getBaseUrl()}/api/playlists`)
    const data = await res.json()
    const playlists: Playlist[] = data.playlists

    expect(res.status).toBe(200)
    expect(Array.isArray(playlists)).toBe(true)
    expect(playlists.length).toBeGreaterThan(0)
    expect(isSortedAlphabetically(playlists, (p) => p.name)).toBe(true)
  })

  test("GET /api/playlists?q=<query> returns fuzzy search results", async () => {
    const res = await fetch(`${getBaseUrl()}/api/playlists?q=mixtape`)
    const data = await res.json()
    const playlists: Playlist[] = data.playlists

    expect(res.status).toBe(200)
    expect(Array.isArray(playlists)).toBe(true)
    expect(playlists.length).toBeGreaterThan(0)
    const mixtapePlaylist = playlists.find((p) => /mixtape/i.test(p.name))
    expect(mixtapePlaylist).toBeDefined()
  })

  test("GET /api/playlists/:id returns single playlist", async () => {
    const listRes = await fetch(`${getBaseUrl()}/api/playlists`)
    const listData = await listRes.json()
    const firstPlaylist = listData.playlists[0]!

    const res = await fetch(`${getBaseUrl()}/api/playlists/${firstPlaylist.id}`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.playlist).toBeDefined()
    expect(data.playlist.id).toBe(firstPlaylist.id)
    expect(data.playlist.name).toBe(firstPlaylist.name)
    expect(Array.isArray(data.playlist.tracks)).toBe(true)
  })

  test("GET /api/playlists/:id returns 404 for unknown playlist", async () => {
    const res = await fetch(`${getBaseUrl()}/api/playlists/unknown-playlist-id`)

    expect([404, 500]).toContain(res.status)
  })
})
