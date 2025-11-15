import Elysia, { NotFoundError, redirect, t } from "elysia"
import { openapi, fromTypes } from "@elysiajs/openapi"
import Fuse from "fuse.js"
import index from "@/index.html"
import { env } from "@/env"
import { parse } from "@/parse"
import type {
  Album,
  ArtAsset,
  Artist,
  AudioAsset,
  Source,
  Track,
} from "@/lib/types"
import { raise } from "@/lib/utils"
import { $ } from "bun"

if (env.USE_FFMPEG) {
  console.warn(
    Bun.color("yellow", "ansi") +
      "FFMPEG audio file conversion is enabled. if you are experiencing issues, try setting USE_FFMPEG=0 disable it.",
  )
}

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
  artAssets: new Map<string, ArtAsset>(),
  audioAssets: new Map<string, AudioAsset>(),
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
  db.artAssets.clear()
  db.audioAssets.clear()

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
      for (const asset of new_db.artAssets.values()) {
        db.artAssets.set(asset.id, asset)
      }
      for (const asset of new_db.audioAssets.values()) {
        db.audioAssets.set(asset.id, asset)
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
    artAssets: db.artAssets.size,
    audioAssets: db.audioAssets.size,
  })
}

await reloadLibrary()

const app = new Elysia()
  .use(
    openapi({
      path: "/openapi",
      references: fromTypes(),
    }),
  )
  .get("/*", index, { detail: "hide" })
  .get("/api/*", "418")
  .get("/api", () => redirect("/openapi"))
  .get("/api/stats", {
    artists: db.artists.size,
    albums: db.albums.size,
    tracks: db.tracks.size,
    artAssets: db.artAssets.size,
    audioAssets: db.audioAssets.size,
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
    },
  )
  .get("/api/artists/:artistId", async ({ params: { artistId } }) => {
    const artist = db.artists.get(artistId)
    if (!artist) {
      return { artist: undefined }
    }
    const artistAlbums = Array.from(db.albums.values()).filter(
      (a) => a.artistId === artistId,
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
    { detail: "Get albums", query: t.Object({ q: t.Optional(t.String()) }) },
  )
  .get("/api/albums/:albumId", async ({ params: { albumId } }) => {
    const album = db.albums.get(albumId)
    if (!album) {
      return { album: undefined }
    }
    const albumTracks = Array.from(db.tracks.values()).filter(
      (t) => t.albumId === albumId,
    )

    const tracks = albumTracks
      .map((tr) => {
        const track = db.tracks.get(tr.id) ?? raise("Track not found in db") // TODO: actual error management

        const assets = db.audioAssets.values().toArray()
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
    },
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
    },
  )
  .get("/api/files/track/:trackId", async ({ params: { trackId } }) => {
    try {
      const track = db.tracks.get(trackId) ?? raise("Track not found in db") // TODO: actual error management

      const assets = db.audioAssets.values().toArray()

      console.log("assets", assets)

      return Bun.file(track.path)
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/assets", async () => {
    try {
      /** TODO: audio assets */
      const assets = Array.from(db.audioAssets.values())
      return { assets }
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/assets/:assetId", async ({ params: { assetId }, set, status }) => {
    const asset = db.audioAssets.get(assetId)
    if (!asset) {
      return status(404, "Asset not found")
    }

    if (env.USE_FFMPEG)
      try {
        const proc =
          await $`ffmpeg -i ${asset?.path ?? ""} -f mp3 -vn -q:a 1 pipe:1`.quiet()
        console.error(proc.stderr.toString())
        set.headers["content-type"] = "audio/mpeg"

        return proc.stdout
      } catch (error) {
        console.error(error)
      }

    const file = Bun.file(asset?.path ?? "")
    set.headers["content-type"] = file.type
    return file
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

      const audio_assets = [...db.audioAssets.values()].filter(
        (asset) => asset.parentId == trackId,
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
    { body: t.Object({ trackId: t.String() }) },
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
      albumTracks.length,
    )

    return { album, tracks: albumTracks }
  })
  .listen(env.PORT, () => {
    console.log(`started in ${(performance.now() - started_at).toFixed(2)} ms`)
  })

export type App = typeof app

console.log("Spelemann running on port", env.PORT)
