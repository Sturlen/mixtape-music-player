import Elysia, { NotFoundError, redirect, t } from "elysia"
import { openapi, fromTypes } from "@elysiajs/openapi"
import Fuse from "fuse.js"
import index from "./index.html"
import { env } from "./env"
import { parse } from "./parse"
import type { Album, Artist, Source, Track } from "./lib/types"

const db = {
  artists: new Map<string, Artist>(),
  albums: new Map<string, Album>(),
  tracks: new Map<string, Track>(),
}

export const fuse_artists = new Fuse<Artist>([], {
  keys: ["name", "albums.name"],
})

const default_source: Source = {
  id: "source:main",
  name: "Default Source",
  rootPath: env.MUSIC_PATH,
}

const sources: Source[] = [default_source]

if (env.MUSIC2_PATH) {
  sources.push({
    id: "source:2",
    name: "Secondary Source",
    rootPath: env.MUSIC2_PATH,
  })
}

async function reloadLibrary() {
  db.artists.clear()
  db.albums.clear()
  db.tracks.clear()

  for (const source of sources) {
    try {
      const new_db = await parse(source)

      for (const artist of new_db.artists.values()) {
        db.artists.set(artist.id, artist)
      }
      for (const album of new_db.albums.values()) {
        db.albums.set(album.id, album)
      }
      for (const track of new_db.tracks.values()) {
        db.tracks.set(track.id, track)
      }
    } catch (err) {
      console.error(`Error parsing source ${source.id} (${source.name}):`, err)
    }
  }

  fuse_artists.setCollection(Array.from(db.artists.values()))

  console.log("Library reloaded", {
    artists: db.artists.size,
    albums: db.albums.size,
    tracks: db.tracks.size,
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
  .get("/api/stats", {
    artists: db.artists.size,
    albums: db.albums.size,
    tracks: db.tracks.size,
  })
  .get(
    "/api/artists",
    ({ query: { q } }) => {
      if (q) {
        console.log("q", q)
        const out = fuse_artists.search(q).map((res) => res.item)
        return out.map((artist) => {
          const artistAlbums = Array.from(db.albums.values()).filter(
            (a) => a.artistId === artist.id
          )
          return {
            ...artist,
            albums: artistAlbums,
          }
        })
      }

      return Array.from(db.artists.values()).map((artist) => {
        const artistAlbums = Array.from(db.albums.values()).filter(
          (a) => a.artistId === artist.id
        )
        return {
          ...artist,
          albums: artistAlbums,
        }
      })
    },
    {
      detail: "Get artists",
      query: t.Object({ q: t.Optional(t.String()) }),
    }
  )
  .get("/api/artists/:artistId", async ({ params: { artistId } }) => {
    const artist = db.artists.get(artistId)
    if (!artist) {
      return { artist: undefined }
    }
    const artistAlbums = Array.from(db.albums.values()).filter(
      (a) => a.artistId === artistId
    )
    const artistAlbumsWithTracks = artistAlbums.map((album) => {
      const albumTracks = Array.from(db.tracks.values()).filter(
        (t) => t.albumId === album.id
      )
      return {
        ...album,
        tracks: albumTracks,
      }
    })
    return {
      artist: {
        ...artist,
        imagePath: undefined,
        imageUrl: `/api/albumArt/${artistId}`,
        albums: artistAlbumsWithTracks,
      },
    }
  })
  .get("/api/albums", {
    albums: Array.from(db.albums.values()).map((album) => {
      const albumTracks = Array.from(db.tracks.values()).filter(
        (t) => t.albumId === album.id
      )
      return {
        ...album,
        imagePath: undefined,
        tracks: albumTracks.map((tr) => ({ ...tr, artURL: album.imageURL })),
      }
    }),
  })
  .get("/api/albums/:albumId", async ({ params: { albumId } }) => {
    const album = db.albums.get(albumId)
    if (!album) {
      return { album: undefined }
    }
    const albumTracks = Array.from(db.tracks.values()).filter(
      (t) => t.albumId === albumId
    )
    return {
      album: {
        ...album,
        imagePath: undefined,
        imageUrl: `/api/albumArt/${albumId}`,
        tracks: albumTracks.map((tr) => ({
          ...tr,
          artURL: album.imageURL,
        })),
      },
    }
  })
  .get("/api/tracks", Response.json(Array.from(db.tracks.values())))
  .get("/api/tracks/:trackId", async ({ params: { trackId } }) => {
    return Response.json(db.tracks.get(trackId))
  })
  .get(
    "/api/files/artistart/:artistId",
    async ({ params: { artistId }, status }) => {
      const artist = db.artists.get(artistId)
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
      const album = db.albums.get(albumId)
      return Bun.file(album?.imagePath ?? "")
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/files/track/:trackId", async ({ params: { trackId } }) => {
    try {
      const track = db.tracks.get(trackId)
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
