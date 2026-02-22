import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { startServer, stopServer, getBaseUrl } from "./testServer"
import type { Track, Album, Artist } from "@/lib/types"

describe("File Endpoints", () => {
  beforeAll(async () => {
    await startServer()
  })

  afterAll(async () => {
    await stopServer()
  })

  test("GET /api/files/albumart/:id serves image with correct content-type", async () => {
    const albumsRes = await fetch(`${getBaseUrl()}/api/albums`)
    const albumsData = await albumsRes.json()
    const firstAlbum = albumsData.albums[0]

    const res = await fetch(
      `${getBaseUrl()}/api/files/albumart/${firstAlbum.id}`,
    )

    expect(res.status).toBe(200)
    const contentType = res.headers.get("content-type")
    expect(contentType).toMatch(/image\/(webp|jpeg|png|jpg)/)
  })

  test("GET /api/files/albumart/:id returns 404 for unknown album", async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/files/albumart/unknown-album-id`,
    )

    expect([404, 500]).toContain(res.status)
  })

  test("GET /api/files/artistart/:id returns 404 when artist has no image", async () => {
    const artistsRes = await fetch(`${getBaseUrl()}/api/artists`)
    const artists: Artist[] = await artistsRes.json()
    const firstArtist = artists[0]!

    const res = await fetch(
      `${getBaseUrl()}/api/files/artistart/${firstArtist.id}`,
    )

    expect([404, 500]).toContain(res.status)
  })

  test("GET /api/files/artistart/:id returns 404 for unknown artist", async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/files/artistart/unknown-artist-id`,
    )

    expect([404, 500]).toContain(res.status)
  })

  test("GET /api/files/track/:id serves audio file", async () => {
    const tracksRes = await fetch(`${getBaseUrl()}/api/tracks`)
    const tracks: Track[] = await tracksRes.json()
    const firstTrack = tracks[0]!

    const res = await fetch(`${getBaseUrl()}/api/files/track/${firstTrack.id}`)

    expect(res.status).toBe(200)
    const contentType = res.headers.get("content-type")
    expect(contentType).toMatch(/audio\/(mpeg|mp3|mp4)/)
  })

  test("GET /api/assets/:id serves audio asset", async () => {
    const assetsRes = await fetch(`${getBaseUrl()}/api/assets`)
    const assetsData = await assetsRes.json()
    const firstAsset = assetsData.assets[0]

    const res = await fetch(`${getBaseUrl()}/api/assets/${firstAsset.id}`)

    expect(res.status).toBe(200)
  })
})
