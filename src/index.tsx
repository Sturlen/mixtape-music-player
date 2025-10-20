import { serve } from "bun"
import index from "./index.html"
import { openapi, fromTypes } from "@elysiajs/openapi"
import { readdir } from "node:fs/promises"
import path from "node:path"
import Elysia from "elysia"
import { env } from "./env"
import staticPlugin from "@elysiajs/static"

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
  const artist: Artist = {
    id: Bun.hash(artist_dir).toString(16),
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
      artist.imageURL = `/public/${artist_dir}/${filename}`
      console.log(artist.imageURL)
    }
  }

  // console.log(artist_dir, albums)
  db.artists.push(artist)

  for (const album_filename of albums) {
    const album: Album = {
      id: Bun.hash(album_filename).toString(16),
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

      const track: Track = {
        id: Bun.hash(filename).toString(16),
        name: removeLeadingTrackNumber(
          removeExtension(filename).split(" - ").at(-1) ?? filename
        ),
        playtimeSeconds: 0,
        path: track_path,
        URL: `/public/${artist_dir}/${album_filename}/${filename}`,
      }

      if (file.type.startsWith("audio/")) {
        db.tracks.push(track)
        album.tracks.push(track)
      } else if (file.type.startsWith("image/")) {
        album.imagePath = track_path
        album.imageURL = `/public/${artist_dir}/${album_filename}/${filename}`
        track.artURL = album.imageURL
      }
    }

    // TODO: too many loops, too many loops
  }
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
  .use(
    staticPlugin({ prefix: "/public", assets: env.MUSIC_PATH, decodeURI: true })
  )
  .get("/", index)
  .get("/artists/*", index) // bug does not allow root wildcard, so requires you to declare all routes
  .get("/albums/*", index)
  .get("/api/artists/", () => db.artists)
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
  .listen(env.PORT)

export type App = typeof app

console.log("Spelemann running on port", env.PORT)
