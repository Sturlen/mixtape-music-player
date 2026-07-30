import { describe, test, expect } from "bun:test"
import { createTestApp } from "../unit/test-utils"

describe("GET /api/playlists", () => {
  test("returns empty list with no playlists", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(new Request("http://localhost/api/playlists"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.playlists).toEqual([])
  })

  test("returns seeded playlists", async () => {
    const { app, ctx } = await createTestApp()
    ctx.playlistStore.playlists.set("p1", {
      id: "p1",
      name: "Favorites",
      tracks: [{ id: "t1", name: "Song A" }],
    })
    ctx.playlistStore.playlists.set("p2", {
      id: "p2",
      name: "Chill Vibes",
      tracks: [{ id: "t2", name: "Song B" }],
    })
    ctx.playlistStore.tracks.set("t1", {
      id: "t1",
      name: "Song A",
      albumId: "a1",
      playtimeSeconds: 180,
      path: "/dev/null/a.mp3",
    } as any)
    ctx.playlistStore.tracks.set("t2", {
      id: "t2",
      name: "Song B",
      albumId: "a1",
      playtimeSeconds: 200,
      path: "/dev/null/b.mp3",
    } as any)
    const res = await app.handle(new Request("http://localhost/api/playlists"))
    const body = await res.json()
    expect(body.playlists).toHaveLength(2)
  })

  test("returns fuzzy search results with ?q parameter", async () => {
    const { app, ctx } = await createTestApp()
    ctx.playlistStore.playlists.set("p1", {
      id: "p1",
      name: "My Awesome Mixtape",
      tracks: [{ id: "t1", name: "Song A" }],
    })
    ctx.playlistStore.playlists.set("p2", {
      id: "p2",
      name: "Chill Vibes",
      tracks: [{ id: "t2", name: "Song B" }],
    })
    ctx.fuseInstances.fuse_playlists.setCollection(
      Array.from(ctx.playlistStore.playlists.values()),
    )
    const res = await app.handle(
      new Request("http://localhost/api/playlists?q=mixtape"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.playlists).toHaveLength(1)
    expect(body.playlists[0]!.name).toBe("My Awesome Mixtape")
  })
})

describe("GET /api/playlists/:id", () => {
  test("returns playlist by id", async () => {
    const { app, ctx } = await createTestApp()
    ctx.playlistStore.playlists.set("p1", {
      id: "p1",
      name: "My Playlist",
      tracks: [{ id: "t1", name: "Track X" }],
    })
    ctx.playlistStore.tracks.set("t1", {
      id: "t1",
      name: "Track X",
      albumId: "a1",
      playtimeSeconds: 180,
      path: "/dev/null/x.mp3",
    } as any)
    const res = await app.handle(
      new Request("http://localhost/api/playlists/p1"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.playlist.name).toBe("My Playlist")
    expect(body.playlist.id).toBe("p1")
  })

  test("returns 404 for unknown playlist", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(
      new Request("http://localhost/api/playlists/unknown"),
    )
    expect(res.status).toBe(404)
  })
})
