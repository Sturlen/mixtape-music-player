import { serve } from "bun"
import index from "./index.html"

import { readdir } from "node:fs/promises"
import path from "node:path"

const music_exts = ["mp3", "flac"] as const
const art_exts = ["jpeg", "png", "webp"] as const

// TODO: make a config for this
const music_root_path = "\\\\Swisscheese\\plex\\Library\\mp3\\"

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

const file_strings = await readdir(music_root_path, { recursive: true })
const files = file_strings.map((x) => Bun.file(x))

// files.forEach(console.log)
const split_files = file_strings.map((x) => x.split(path.sep))
const artists = Object.groupBy(file_strings, (arr) => arr.split(path.sep)[0])
// console.log(artists)

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    // todo: 404 pgae
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        })
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        })
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name
      return Response.json({
        message: `Hello, ${name}!`,
      })
    },

    "/api/track.mp3": new Response(
      await Bun.file(
        "\\\\Swisscheese\\plex\\Library\\mp3\\Ghost\\" +
          "Seven Inches of Satanic Panic\\Mary On A Cross.mp3"
      ).bytes(),
      {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      }
    ),
    "/api/tracks": Response.json(db.tracks),
    "/api/tracks/:trackId": async (req) => {
      return Response.json(
        db.tracks.find((track) => track.id == req.params.trackId)
      )
    },
    "/api/playback/:track": async (req) => {
      const track = db.tracks.find((track) => track.id === req.params.track)

      if (!track) {
        return new Response("Track not found", { status: 404 })
      }

      const file = Bun.file(track.path)

      return new Response(await file.bytes(), {
        headers: {
          "Content-Type": file.type,
        },
      })
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
})

console.log(`🚀 Server running at ${server.url}`)
