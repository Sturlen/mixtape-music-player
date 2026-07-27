import { describe, test, expect } from "bun:test"
import { createTestApp } from "../unit/test-utils"

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
})
