import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { startServer, stopServer, getBaseUrl } from "./testServer"
import { EXPECTED_STATS } from "./fixtures"

describe("Stats Endpoint", () => {
  beforeAll(async () => {
    await startServer()
  })

  afterAll(async () => {
    await stopServer()
  })

  test("GET /api/stats returns counts matching demo library", async () => {
    const res = await fetch(`${getBaseUrl()}/api/stats`)
    const stats = await res.json()

    expect(res.status).toBe(200)
    expect(stats.artists).toBe(EXPECTED_STATS.artists)
    expect(stats.albums).toBe(EXPECTED_STATS.albums)
    expect(stats.tracks).toBe(EXPECTED_STATS.tracks)
    expect(stats.artAssets).toBe(EXPECTED_STATS.artAssets)
    expect(stats.audioAssets).toBe(EXPECTED_STATS.audioAssets)
    expect(stats.playlists).toBe(EXPECTED_STATS.playlists)
  })
})
