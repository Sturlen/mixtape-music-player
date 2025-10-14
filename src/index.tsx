import { serve } from "bun"
import index from "./index.html"
import { openapi, fromTypes } from "@elysiajs/openapi"
import { readdir } from "node:fs/promises"
import path from "node:path"
import Elysia from "elysia"
import { env } from "./env"

const music_exts = ["mp3", "flac"] as const
const art_exts = ["jpeg", "png", "webp"] as const

// TODO: make a config for this
const music_root_path = env.MUSIC_PATH

type Track = {
  id: string
  name: string
  playtimeSeconds: number
  path: string
}

type Album = {
  id: string
  name: string
  tracks: Track[]
  imagePath?: string
}

type Artist = {
  id: string
  name: string
  albums: Album[]
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
    id: crypto.randomUUID(),
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

  // console.log(artist_dir, albums)
  db.artists.push(artist)

  for (const album_name of albums) {
    const album: Album = {
      id: crypto.randomUUID(),
      name: album_name,
      tracks: [],
    }

    db.albums.push(album)
    artist.albums.push(album)

    // console.log(album_name)

    const tracks = (
      await readdir(path.join(music_root_path, artist_dir, album_name), {
        withFileTypes: true,
      })
    )
      .filter((x) => !x.isDirectory())
      .map((x) => x.name)

    for (const track_name of tracks) {
      const track_path = path.join(
        music_root_path,
        artist_dir,
        album_name,
        track_name
      )
      const file = Bun.file(track_path)

      const track: Track = {
        id: crypto.randomUUID(),
        name: track_name,
        playtimeSeconds: 0,
        path: track_path,
      }

      if (file.type.startsWith("audio/")) {
        db.tracks.push(track)
        album.tracks.push(track)
      } else if (file.type.startsWith("image/")) {
        album.imagePath = track_path
      }
    }

    // TODO: too many loops, too many loops
  }
}

console.log(db.tracks)

const app = new Elysia()
  .use(
    openapi({
      path: "/openapi",
      references: fromTypes(),
    })
  )
  .get("/*", index)
  .get("/api/artists", () => db.artists)
  .get("/api/artists/:artistId", async ({ params: { artistId } }) => {
    return Response.json(db.artists.find((a) => a.id == artistId))
  })
  .get("/api/albums", {
    albums: db.albums.map((alb) => ({
      ...alb,
      imagePath: undefined,
      imageUrl: `/api/albumArt/${alb.id}`,
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
          }
        : undefined,
    }
  })
  .get("/api/tracks", Response.json(db.tracks))
  .get("/api/tracks/:trackId", async ({ params: { trackId } }) => {
    return Response.json(db.tracks.find((track) => track.id == trackId))
  })
  .get("/api/playback/:track", async (req) => {
    const track = db.tracks.find((track) => track.id === req.params.track)

    if (!track) {
      return new Response("Art not found", { status: 404 })
    }

    const file = Bun.file(track.path)

    return new Response(await file.bytes(), {
      headers: {
        "Content-Type": file.type,
      },
    })
  })
  .get("/api/albumArt/:albumId", async (req) => {
    const album = db.albums.find((alb) => alb.id === req.params.albumId)

    if (!album) {
      return new Response("Album not found", { status: 404 })
    }

    if (!album.imagePath) {
      return new Response("Album has no album art", { status: 404 })
    }

    const file = Bun.file(album.imagePath)

    return new Response(await file.bytes(), {
      headers: {
        "Content-Type": file.type,
      },
    })
  })
  .listen(3000)

export type App = typeof app

console.log("Running!")
