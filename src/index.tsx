import { serve } from "bun"
import index from "./index.html"
import { openapi, fromTypes } from "@elysiajs/openapi"
import { readdir } from "node:fs/promises"
import path from "node:path"
import Elysia, { NotFoundError, redirect, t } from "elysia"
import { env } from "./env"
import staticPlugin from "@elysiajs/static"
import Fuse from "fuse.js"

const music_exts = ["mp3", "flac"] as const
const art_exts = ["jpeg", "png", "webp"] as const

// TODO: make a config for this
const music_root_path = env.MUSIC_PATH

type Track = {
  id: string
  name: string
  playtimeSeconds: number
  path: string
  URL: string
  artURL?: string
}

type Album = {
  id: string
  name: string
  tracks: Track[]
  imagePath?: string
  imageURL?: string
}

type Artist = {
  id: string
  name: string
  albums: Album[]
  imagePath?: string
  imageURL?: string
}

const db = {
  artists: new Array<Artist>(),
  albums: new Array<Album>(),
  tracks: new Array<Track>(),
}

const fuse_artists = new Fuse<Artist>([], { keys: ["name", "albums.name"] })

async function parse() {
  db.artists.length = 0
  db.albums.length = 0
  db.tracks.length = 0

  // read all the files in the current directory
  const artist_dirents = await readdir(music_root_path, {
    recursive: false,
    withFileTypes: true,
  })
  const artist_dirs = artist_dirents
    .filter((x) => x.isDirectory())
    .map((x) => x.name)

  for (const artist_dir of artist_dirs) {
    const artist_id = Bun.hash(artist_dir).toString(16)
    const artist: Artist = {
      id: artist_id,
      name: artist_dir,
      albums: [],
    }
    const albums = (
      await readdir(path.join(music_root_path, artist_dir), {
        withFileTypes: true,
      })
    )
      .filter((x) => x.isDirectory())
      .map((x) => x.name)

    const artist_dir_files = (
      await readdir(path.join(music_root_path, artist_dir), {
        withFileTypes: true,
      })
    )
      .filter((x) => x.isFile())
      .map((file) => file.name)

    for (const filename of artist_dir_files) {
      const file = Bun.file(path.join(music_root_path, artist_dir, filename))
      if (file.type.startsWith("image/")) {
        artist.imagePath = path.join(music_root_path, artist_dir, filename)
        artist.imageURL = `/api/files/artistart/${artist_id}`
        console.log(artist.id, artist.name, artist.imageURL)
      }
    }

    // console.log(artist_dir, albums)
    db.artists.push(artist)

    for (const album_filename of albums) {
      const album_id = Bun.hash(album_filename).toString(16)
      const album: Album = {
        id: album_id,
        name: removeBandcampHeaders(album_filename),
        tracks: [],
      }

      db.albums.push(album)
      artist.albums.push(album)

      // console.log(album_name)

      const tracks = (
        await readdir(path.join(music_root_path, artist_dir, album_filename), {
          withFileTypes: true,
          recursive: true,
        })
      )
        .filter((x) => !x.isDirectory())
        .map(({ name, parentPath }) => ({ filename: name, parentPath }))

      for (const { filename, parentPath } of tracks) {
        const filepath = path.join(parentPath, filename)

        const file = Bun.file(filepath)
        const track_id = Bun.hash(filename).toString(16)
        const { trackNumber, title } = extractSongInfo(filename)
        const track: Track = {
          id: track_id,
          name: title,
          playtimeSeconds: 0,
          path: filepath,
          URL: `/api/files/track/${track_id}`,
        }

        if (file.type.startsWith("audio/")) {
          db.tracks.push(track)
          album.tracks.push(track)
        } else if (file.type.startsWith("image/")) {
          album.imagePath = filepath
          album.imageURL = `/api/files/albumart/${album_id}`
          track.artURL = album.imageURL
        }
      }

      // TODO: too many loops, too many loops
    }
  }

  fuse_artists.setCollection(db.artists)
}

function removeBandcampHeaders(str: string) {
  return str.split(" - ").at(-1) ?? str
}

/** For Bandcamp-style track names */
function extractSongInfo(filename: string): {
  artist: string | null
  album: string | null
  trackNumber: string | null
  title: string
} {
  // Remove file extension
  const baseName = filename.replace(/\.[^.]+$/, "")

  // Pattern: "Artist - Album - 01 Title" or "Artist - Album - Title"
  const match = baseName.match(/^(.+?)\s-\s(.+?)\s-\s(?:(\d+)\s)?(.+)$/)

  if (!match || !match[1] || !match[2] || !match[4]) {
    return {
      artist: null,
      album: null,
      trackNumber: null,
      title: baseName,
    }
  }

  return {
    artist: match[1].trim(),
    album: match[2].trim(),
    trackNumber: match[3] ?? null,
    title: match[4].trim(),
  }
}

await parse()

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
  .post("/api/libary/reload", async () => await parse(), {
    detail: {
      description: "Reloads the internal db and parses all sources again",
    },
  })
  .listen(env.PORT)

export type App = typeof app

console.log("Spelemann running on port", env.PORT)
