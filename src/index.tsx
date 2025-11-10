import Elysia, { NotFoundError, redirect, status, t } from "elysia"
import { openapi, fromTypes } from "@elysiajs/openapi"
import Fuse from "fuse.js"
import index from "@/index.html"
import { env } from "@/env"
import { parse } from "@/parse"
import type { Album, Artist, Asset, Source, Track } from "@/lib/types"
import { processImage, getMimeType } from "@/lib/imageHandler"
import { raise } from "@/lib/utils"
import {
  Input,
  Output,
  WebMOutputFormat,
  BufferTarget,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  Mp3OutputFormat,
  canEncodeAudio,
  QUALITY_VERY_LOW,
  FlacOutputFormat,
} from "mediabunny"

import { registerMp3Encoder } from "@mediabunny/mp3-encoder"

if (!(await canEncodeAudio("mp3"))) {
  registerMp3Encoder()
}

console.log("Can Encode FLAC", await canEncodeAudio("flac"))
console.log("Can Encode Mp3", await canEncodeAudio("mp3"))

import {
  audio,
  audioWithStreamInputAndOut,
  type FfmpegAudioOptions,
} from "bun-ffmpeg"
import { th } from "zod/v4/locales"
import { streamToMp3 } from "./encode"

function compareTracksByNumberName(a: Track, b: Track): number {
  if (a.trackNumber !== undefined && b.trackNumber !== undefined) {
    return a.trackNumber - b.trackNumber
  } else if (a.trackNumber !== undefined) {
    return -1
  } else if (b.trackNumber !== undefined) {
    return 1
  } else {
    return a.name.localeCompare(b.name)
  }
}

const started_at = performance.now()

const db = {
  artists: new Map<string, Artist>(),
  albums: new Map<string, Album>(),
  tracks: new Map<string, Track>(),
  assets: new Map<string, Asset>(),
}

export const fuse_artists = new Fuse<Artist>([], {
  keys: ["name"],
})

export const fuse_albums = new Fuse<Album>([], {
  keys: ["name"],
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
  fuse_albums.setCollection(Array.from(db.albums.values()))

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
      let artists: Artist[] = []
      if (q) {
        console.log("q", q)
        artists = fuse_artists.search(q).map((res) => res.item)
      } else {
        artists = Array.from(db.artists.values())
      }

      return artists.sort((a, b) => a.name.localeCompare(b.name))
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

    return {
      artist: {
        ...artist,
        imagePath: undefined,
        imageUrl: `/api/albumArt/${artistId}`,
        albums: artistAlbums,
      },
    }
  })
  .get(
    "/api/albums",
    async ({ query: { q } }) => {
      let albums: Album[] = []
      if (q) {
        console.log("q", q)
        albums = fuse_albums.search(q).map((res) => res.item)
      } else {
        albums = Array.from(db.albums.values())
      }
      return {
        albums: albums
          .map((album) => {
            return {
              ...album,
              imagePath: undefined,
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name)),
      }
    },
    { detail: "Get albums", query: t.Object({ q: t.Optional(t.String()) }) }
  )
  .get("/api/albums/:albumId", async ({ params: { albumId } }) => {
    const album = db.albums.get(albumId)
    if (!album) {
      return { album: undefined }
    }
    const albumTracks = Array.from(db.tracks.values()).filter(
      (t) => t.albumId === albumId
    )

    const tracks = albumTracks
      .map((tr) => {
        const track = db.tracks.get(tr.id) ?? raise("Track not found in db") // TODO: actual error management

        const assets = db.assets
          .values()
          .filter((a) => a.parentId === track.id && a.filetype === "audio")
          .toArray()
        return { ...tr, artURL: album.imageURL, assets }
      })
      .sort(compareTracksByNumberName)

    return {
      album: {
        ...album,
        imagePath: undefined,
        imageUrl: `/api/albumArt/${albumId}`,
        tracks: tracks,
      },
    }
  })
  .get("/api/tracks", () => Array.from(db.tracks.values()))
  .get("/api/tracks/:trackId", async ({ params: { trackId } }) => {
    return db.tracks.get(trackId)
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
        const file = Bun.file(artist.imagePath)
        set.headers["Content-Type"] = file.type
        set.headers["Cache-Control"] = "public, max-age=86400"

        return file
      } catch (err) {
        console.error(`Error serving artist art for ${artistId}:`, err)
        throw new NotFoundError()
      }
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

        const file = Bun.file(album.imagePath)
        set.headers["Content-Type"] = file.type
        set.headers["Cache-Control"] = "public, max-age=86400"

        return file
      } catch (err) {
        console.error(`Error serving album art for ${albumId}:`, err)
        throw new NotFoundError()
      }
    }
  )
  .get("/api/files/track/:trackId", async ({ params: { trackId } }) => {
    try {
      const track = db.tracks.get(trackId) ?? raise("Track not found in db") // TODO: actual error management

      const assets = db.assets
        .values()
        .filter((a) => a.parentId === trackId && a.filetype === "audio")
        .toArray()

      console.log("assets", assets)

      return Bun.file(track.path)
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/assets", async () => {
    try {
      const assets = Array.from(db.assets.values())
      return { assets }
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/assets/:assetId", ({ params: { assetId } }) => {
    const asset = db.assets.get(assetId)
    if (!asset?.path) throw new NotFoundError()

    const file = Bun.file(asset.path)

    const stream = streamToMp3({
      args: [],
      input: file.stream(),
      duration: 6000,
    })
    return new Response(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    })
  })

  .post("/api/libary/reload", async () => await reloadLibrary(), {
    detail: {
      description: "Reloads the internal db and parses all sources again",
    },
  })
  .post(
    "/api/player",
    async ({ body: { trackId }, status }) => {
      if (!trackId) {
        return status("Bad Request")
      }

      const track = db.tracks.get(trackId)

      if (!track) {
        return status("Not Found")
      }

      // TODO: ACCEPTS or codec check

      const audio_assets = [...db.assets.values()].filter(
        (asset) => asset.parentId == trackId && asset.filetype === "audio"
      )

      console.log("audio assets found: ", audio_assets)

      // TODO: auth check

      const main_asset = audio_assets[0]

      if (!main_asset) {
        console.log("No audio asset found")
        return status(404)
      }

      console.log("playback started ", track.id)

      return {
        url: `/api/assets/${main_asset.id}`, //TODO: adapt to s3 or similar later
      }
    },
    { body: t.Object({ trackId: t.String() }) }
  )
  .post("/api/playAlbum/:albumId", async ({ params: { albumId }, status }) => {
    const album = db.albums.get(albumId)
    if (!album) {
      return status(404)
    }
    const albumTracks = Array.from(db.tracks.values())
      .filter((t) => t.albumId === albumId)
      .sort(compareTracksByNumberName)

    console.log(
      "playAlbum requested for album",
      albumId,
      "tracks:",
      albumTracks.length
    )

    return { album, tracks: albumTracks }
  })
  .listen(env.PORT, () => {
    console.log(`started in ${(performance.now() - started_at).toFixed(2)} ms`)
  })

export type App = typeof app

console.log("Spelemann running on port", env.PORT)

function bufferToHex(data: ArrayBuffer | Uint8Array, length = 16): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data
  const hex = Array.from(bytes.slice(0, length))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ")
  return hex
}
