import { serve } from "bun"
import index from "./index.html"
import { openapi, fromTypes } from "@elysiajs/openapi"
import { readdir } from "node:fs/promises"
import path from "node:path"
import Elysia, { NotFoundError } from "elysia"
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

// parser

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
      name: album_filename,
      tracks: [],
    }

    db.albums.push(album)
    artist.albums.push(album)

    // console.log(album_name)

    const tracks = (
      await readdir(path.join(music_root_path, artist_dir, album_filename), {
        withFileTypes: true,
      })
    )
      .filter((x) => !x.isDirectory())
      .map((x) => x.name)

    for (const filename of tracks) {
      const track_path = path.join(
        music_root_path,
        artist_dir,
        album_filename,
        filename
      )
      const track_url = path.join(
        music_root_path,
        artist_dir,
        album_filename,
        filename
      )
      const file = Bun.file(track_path)
      const track_id = Bun.hash(filename).toString(16)
      const track: Track = {
        id: track_id,
        name: removeLeadingTrackNumber(
          removeBandcampHeaders(removeExtension(filename))
        ),
        playtimeSeconds: 0,
        path: track_path,
        URL: `/api/files/track/${track_id}`,
      }

      if (file.type.startsWith("audio/")) {
        db.tracks.push(track)
        album.tracks.push(track)
      } else if (file.type.startsWith("image/")) {
        album.imagePath = track_path
        album.imageURL = `/api/files/albumart/${album_id}`
        track.artURL = album.imageURL
      }
    }

    // TODO: too many loops, too many loops
  }
}

function removeBandcampHeaders(str: string) {
  if (str.search(/\[/)) {
    return str // skip for downloads
  }
  return str.split(" - ").at(-1) ?? str
}

function removeExtension(name: string): string {
  // Removes the last ".ext" if present and not at start (preserves ".env")
  return name.replace(/(?<!^)\.[^./\\]+$/u, "")
}

function parseAndStripTrackNumber(input: string): {
  trackNumber: number | null
  title: string
} {
  const m = input.match(/^\s*(\d{1,3})\s*[-.)_:]?\s*(.*)$/u)
  if (!m) return { trackNumber: null, title: input }
  const [, num, rest] = m
  return { trackNumber: Number(num), title: rest ?? input }
}

const fuse_artists = new Fuse(db.artists, { keys: ["name", "albums.name"] })

function removeLeadingTrackNumber(input: string): string {
  return input.replace(/^\s*\d{1,3}\s*-\s*/u, "")
}
// console.log(db.tracks)

const app = new Elysia()
  .use(
    openapi({
      path: "/openapi",
      references: fromTypes(),
    })
  )
  .get("/", index)
  .get("/artists/*", index) // bug does not allow root wildcard, so requires you to declare all routes
  .get("/albums/*", index)
  .get("/api/artists/", ({ query: { q } }) => {
    if (q) {
      console.log("q", q)
      const out = fuse_artists.search(q).map((res) => res.item)
      return out
    }

    return db.artists
  })
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
  .listen(env.PORT)

export type App = typeof app

console.log("Spelemann running on port", env.PORT)
