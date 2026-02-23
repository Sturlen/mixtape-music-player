import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { startServer, stopServer, getBaseUrl } from "./testServer"
import type { Track } from "@/lib/types"

describe("Track Endpoints", () => {
  beforeAll(async () => {
    await startServer()
  })

  afterAll(async () => {
    await stopServer()
  })

  test("GET /api/tracks returns all tracks", async () => {
    const res = await fetch(`${getBaseUrl()}/api/tracks`)
    const tracks: Track[] = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(tracks)).toBe(true)
    expect(tracks.length).toBeGreaterThan(0)
  })

  test("GET /api/tracks/:id returns single track", async () => {
    const listRes = await fetch(`${getBaseUrl()}/api/tracks`)
    const tracks: Track[] = await listRes.json()
    const firstTrack = tracks[0]!

    const res = await fetch(`${getBaseUrl()}/api/tracks/${firstTrack.id}`)
    const track: Track = await res.json()

    expect(res.status).toBe(200)
    expect(track).toBeDefined()
    expect(track.id).toBe(firstTrack.id)
    expect(track.name).toBe(firstTrack.name)
  })

  test("GET /api/tracks/:id returns undefined for unknown track", async () => {
    const res = await fetch(`${getBaseUrl()}/api/tracks/unknown-track-id`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toBeNull()
  })
})
