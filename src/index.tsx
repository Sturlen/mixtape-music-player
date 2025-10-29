import Elysia, { NotFoundError, redirect, t } from "elysia"
import { openapi, fromTypes } from "@elysiajs/openapi"
import Fuse from "fuse.js"
import index from "./index.html"
import { env } from "./env"
import { parse } from "./parse"
import type { Album, Artist, Asset, Source, Track } from "./lib/types"
import { processImage, getMimeType } from "./lib/imageHandler"

const started_at = performance.now()

const db = {
  artists: new Map<string, Artist>(),
  albums: new Map<string, Album>(),
  tracks: new Map<string, Track>(),
  assets: new Map<string, Asset>(),
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
  db.assets.clear()

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
      for (const asset of new_db.assets.values()) {
        db.assets.set(asset.id, asset)
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
    assets: db.assets.size,
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
    assets: db.assets.size,
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
    async ({ params: { artistId }, query, set, status }) => {
      const artist = db.artists.get(artistId)
      if (!artist) {
        console.error("artist", artistId, "not found")
        return status(404)
      }

      try {
        if (!artist.imagePath) {
          throw new NotFoundError()
        }

        const width = query.w ? parseInt(query.w as string) : 256
        const height = query.h ? parseInt(query.h as string) : 256
        const quality = query.q ? parseInt(query.q as string) : 80
        const format = (query.f as "jpeg" | "png" | "webp" | "avif") || "webp"

        // If no sizing requested, return original file
        if (!width && !height) {
          return Bun.file(artist.imagePath)
        }

        // Process image with Sharp
        const buffer = await processImage(artist.imagePath, {
          width,
          height,
          quality,
          format,
        })

        set.headers["Content-Type"] = getMimeType(format)
        set.headers["Cache-Control"] = "public, max-age=86400"

        return buffer
      } catch (err) {
        console.error(`Error serving artist art for ${artistId}:`, err)
        throw new NotFoundError()
      }
    },
    {
      query: t.Object({
        w: t.Optional(t.String()),
        h: t.Optional(t.String()),
        q: t.Optional(t.String()),
        f: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/api/files/albumart/:albumId",
    async ({ params: { albumId }, query, set }) => {
      try {
        const album = db.albums.get(albumId)
        if (!album?.imagePath) {
          throw new NotFoundError()
        }

        const width = query.w ? parseInt(query.w as string) : undefined
        const height = query.h ? parseInt(query.h as string) : undefined
        const quality = query.q ? parseInt(query.q as string) : 80
        const format = (query.f as "jpeg" | "png" | "webp" | "avif") || "webp"

        // If no sizing requested, return original file
        if (!width && !height) {
          return Bun.file(album.imagePath)
        }

        // Process image with Sharp
        const buffer = await processImage(album.imagePath, {
          width,
          height,
          quality,
          format,
        })

        set.headers["Content-Type"] = getMimeType(format)
        set.headers["Cache-Control"] = "public, max-age=86400"

        return buffer
      } catch (err) {
        console.error(`Error serving album art for ${albumId}:`, err)
        throw new NotFoundError()
      }
    },
    {
      query: t.Object({
        w: t.Optional(t.String()),
        h: t.Optional(t.String()),
        q: t.Optional(t.String()),
        f: t.Optional(t.String()),
      }),
    }
  )
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
  .listen(env.PORT, () => {
    console.log(`started in ${(performance.now() - started_at).toFixed(2)} ms`)
  })

export type App = typeof app

console.log("Spelemann running on port", env.PORT)
