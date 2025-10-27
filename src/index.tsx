import Elysia, { NotFoundError, redirect, t } from "elysia"
import { openapi, fromTypes } from "@elysiajs/openapi"
import Fuse from "fuse.js"
import index from "./index.html"
import { env } from "./env"
import { parse } from "./parse"
import type { Album, Artist, Source, Track } from "./lib/types"

const db = {
  artists: new Array<Artist>(),
  albums: new Array<Album>(),
  tracks: new Array<Track>(),
}

export const fuse_artists = new Fuse<Artist>([], {
  keys: ["name", "albums.name"],
})

const default_source: Source = {
  id: "source:main",
  name: "Default Source",
  rootPath: env.MUSIC_PATH,
}

async function reloadLibrary() {
  const new_db = await parse(default_source)
  db.artists.length = 0
  db.albums.length = 0
  db.tracks.length = 0

  db.artists.push(...new_db.artists)
  db.albums.push(...new_db.albums)
  db.tracks.push(...new_db.tracks)

  fuse_artists.setCollection(db.artists)

  console.log("Library reloaded", {
    artists: db.artists.length,
    albums: db.albums.length,
    tracks: db.tracks.length,
  })
}

await reloadLibrary()

const app = new Elysia()
  .use(
    openapi({
      path: "/openapi",
      references: fromTypes(),
    })
  )
  .get("/*", index, { detail: "hide" })
  .get("/api/*", "418")
  .get("/api", () => redirect("/openapi"))
  .get(
    "/api/artists",
    ({ query: { q } }) => {
      if (q) {
        console.log("q", q)
        const out = fuse_artists.search(q).map((res) => res.item)
        return out
      }

      return db.artists
    },
    {
      detail: "Get artists",
      query: t.Object({ q: t.Optional(t.String()) }),
    }
  )
  .get("/api/artists/:artistId", async ({ params: { artistId } }) => {
    const artist = db.artists.find((a) => a.id == artistId)
    return {
      artist: artist
        ? {
            ...artist,
            imagePath: undefined,
            imageUrl: `/api/albumArt/${artistId}`,
          }
        : undefined,
    }
  })
  .get("/api/albums", {
    albums: db.albums.map((album) => ({
      ...album,
      imagePath: undefined,
      tracks: album.tracks.map((tr) => ({ ...tr, artURL: album.imageURL })),
    })),
  })
  .get("/api/albums/:albumId", async ({ params: { albumId } }) => {
    const album = db.albums.find((a) => a.id == albumId)
    return {
      album: album
        ? {
            ...album,
            imagePath: undefined,
            imageUrl: `/api/albumArt/${albumId}`,
            tracks: album.tracks.map((tr) => ({
              ...tr,
              artURL: album.imageURL,
            })),
          }
        : undefined,
    }
  })
  .get("/api/tracks", Response.json(db.tracks))
  .get("/api/tracks/:trackId", async ({ params: { trackId } }) => {
    return Response.json(db.tracks.find((track) => track.id == trackId))
  })
  .get(
    "/api/files/artistart/:artistId",
    async ({ params: { artistId }, status }) => {
      const artist = db.artists.find((a) => a.id == artistId)
      if (!artist) {
        console.error("artist", artistId, "not found")
        return status(404)
      }
      try {
        return Bun.file(artist.imagePath ?? "")
      } catch (err) {
        console.error(artist?.imageURL)
        throw new NotFoundError()
      }
    }
  )
  .get("/api/files/albumart/:albumId", async ({ params: { albumId } }) => {
    try {
      const album = db.albums.find((a) => a.id == albumId)
      return Bun.file(album?.imagePath ?? "")
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/files/track/:trackId", async ({ params: { trackId } }) => {
    try {
      const track = db.tracks.find((t) => t.id == trackId)
      return Bun.file(track?.path ?? "")
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .post("/api/libary/reload", async () => await reloadLibrary(), {
    detail: {
      description: "Reloads the internal db and parses all sources again",
    },
  })
  .listen(env.PORT)

export type App = typeof app

console.log("Spelemann running on port", env.PORT)
