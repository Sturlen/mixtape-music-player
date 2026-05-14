import Elysia, { NotFoundError, redirect, t } from "elysia"
import { openapi, fromTypes } from "@elysiajs/openapi"
import { opentelemetry } from "@elysiajs/opentelemetry"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"
import Fuse from "fuse.js"
import pLimit from "p-limit"
import index from "@/index.html"
import { env } from "@/shared/env"
import { parse } from "@/parse"
import type { Album, Artist, Playlist, Source, Track } from "@/lib/types"
import { raise } from "@/lib/utils"
import { $ } from "bun"
import { parsePlaylists } from "./server/new_playlist_parser"
import { createPlaylistRoutes } from "./playlist"
import { mkdirSync, existsSync } from "fs"
import { fuse_artists, fuse_albums, fuse_playlists } from "./lib/fuse"
import { Library } from "./server/library"

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

const library = new Library()

async function loadPlaylists(): Promise<Playlist[]> {
  const playlistsPath = `${env.DATA_PATH}/playlists`

  // Ensure the playlists folder exists
  if (!existsSync(playlistsPath)) {
    console.warn(`Playlists folder not found. Creating: ${playlistsPath}`)
    mkdirSync(playlistsPath, { recursive: true })
  }

  try {
    console.log("Loading playlists from:", playlistsPath)
    const playlistsArr = await parsePlaylists(playlistsPath)
    console.log("Loaded playlists:", playlistsArr)
    return playlistsArr
  } catch (error) {
    console.error("Failed to load playlists:", error)
    return []
  }
}

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
  library.clear()

  const playlistsArr = await loadPlaylists()
  for (const playlist of playlistsArr) {
    library.playlists.set(playlist.id, playlist)
  }
  library.rebuildIndex()

  const limit = pLimit(8)
  const sourceScans = await Promise.all(
    sources.map(async (source) => {
      try {
        return await parse(source)
      } catch (err) {
        console.error(
          `Error scanning source ${source.id} (${source.name}):`,
          err,
        )
        return null
      }
    }),
  )

  const validScans = sourceScans.filter(
    (s): s is NonNullable<typeof s> => s !== null,
  )
  if (validScans.length > 0) {
    library.enrich(limit, validScans)
  }

  console.log("Library reloaded — enrichment in background", {
    playlists: library.playlists.size,
  })
}

await reloadLibrary()

const app = new Elysia()
  .onError(({ error, set, status }) => {
    console.error("An error occurred:", error)

    return status(500)
  })
  .use(
    opentelemetry({
      spanProcessors: env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? [new BatchSpanProcessor(new OTLPTraceExporter())]
        : [],
    }),
  )
  .use(
    openapi({
      path: "/openapi",
      references: fromTypes(),
    }),
  )
  .get("/*", index, { detail: "hide" })
  .get("/api/*", "418")
  .get("/api", () => redirect("/openapi"))
  .get("/api/stats", () => ({
    artists: library.artists.size,
    albums: library.albums.size,
    tracks: library.tracks.size,
    artAssets: library.artAssets.size,
    audioAssets: library.audioAssets.size,
    playlists: library.playlists.size,
  }))
  .get(
    "/api/artists",
    ({ query: { q } }) => {
      let artists: Artist[] = []
      if (q) {
        console.log("q", q)
        artists = fuse_artists
          .search(q)
          .map((res: { item: Artist }) => res.item)
      } else {
        artists = Array.from(library.artists.values())
      }

      return artists.sort((a, b) => a.name.localeCompare(b.name))
    },
    {
      detail: "Get artists",
      query: t.Object({ q: t.Optional(t.String()) }),
    },
  )
  .get("/api/artists/:artistId", async ({ params: { artistId } }) => {
    const artist = library.artists.get(artistId)
    if (!artist) {
      return { artist: undefined }
    }
    const artistAlbums = Array.from(library.albums.values()).filter(
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
        albums = fuse_albums.search(q).map((res: { item: Album }) => res.item)
      } else {
        albums = Array.from(library.albums.values())
      }
      return {
        albums: albums
          .map((album) => {
            const artist = library.artists.get(album.artistId)
            return {
              id: album.id,
              name: album.name,
              artistId: album.artistId,
              artistName: artist?.name,
              imageURL: album.imageURL,
              artAssetId: album.artAssetId,
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name)),
      }
    },
    { detail: "Get albums", query: t.Object({ q: t.Optional(t.String()) }) },
  )
  .get("/api/albums/:albumId", async ({ params: { albumId } }) => {
    const album = library.albums.get(albumId)
    if (!album) {
      return { album: undefined }
    }
    const artist = library.artists.get(album.artistId)
    const albumTracks = Array.from(library.tracks.values()).filter(
      (t) => t.albumId === albumId,
    )

    const tracks = albumTracks
      .map((tr) => {
        const track =
          library.tracks.get(tr.id) ?? raise("Track not found in db") // TODO: actual error management

        const assets = library.audioAssets.values().toArray()
        return { ...tr, artURL: album.imageURL, assets }
      })
      .sort(compareTracksByNumberName)

    return {
      album: {
        id: album.id,
        name: album.name,
        artistId: album.artistId,
        artistName: artist?.name,
        imageURL: album.imageURL,
        tracks: tracks,
      },
    }
  })
  .get("/api/tracks", () => Array.from(library.tracks.values()))
  .get("/api/tracks/:trackId", async ({ params: { trackId } }) => {
    return library.tracks.get(trackId)
  })
  .get(
    "/api/files/artistart/:artistId",
    async ({ params: { artistId }, query, set, status }) => {
      const artist = library.artists.get(artistId)
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
        const album = library.albums.get(albumId)
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
      const track =
        library.tracks.get(trackId) ?? raise("Track not found in db") // TODO: actual error management

      const assets = library.audioAssets.values().toArray()

      console.log("assets", assets)

      return Bun.file(track.path)
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/assets", async () => {
    try {
      /** TODO: audio assets */
      const assets = Array.from(library.audioAssets.values())
      return { assets }
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/assets/:assetId", async ({ params: { assetId }, set, status }) => {
    const asset = library.audioAssets.get(assetId)
    if (!asset) {
      return status(404, "Asset not found")
    }

    if (env.USE_FFMPEG) {
      let ffmpeg_stderr = ""
      try {
        const start = performance.now()
        const proc =
          await $`ffmpeg -i ${asset?.path ?? ""} -f mp3 -vn -q:a 1 pipe:1`.quiet()
        ffmpeg_stderr = proc.stderr.toString()
        set.headers["content-type"] = "audio/mpeg"

        const end = performance.now()

        console.log(
          "ffmpeg took %ds for file '%s'",
          (end - start) / 1000,
          asset.name,
        )

        return proc.stdout
      } catch (error) {
        console.error(ffmpeg_stderr)
        console.error(error)
      }
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

      const track = library.tracks.get(trackId)

      if (!track) {
        return status("Not Found")
      }

      // TODO: ACCEPTS or codec check

      const audio_assets = [...library.audioAssets.values()].filter(
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
    const album = library.albums.get(albumId)
    if (!album) {
      return status(404)
    }
    const albumTracks = Array.from(library.tracks.values())
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
  .post(
    "/api/playPlaylist/:playlistId",
    async ({ params: { playlistId }, status }) => {
      const playlist = library.playlists.get(playlistId)
      if (!playlist) {
        return status(404)
      }
      // Map playlist.tracks to full track objects from db.tracks
      const playlistTracks = playlist.tracks
        .map((plTrack, i) => {
          const fullTrack = library.tracks.get(plTrack.id)
          if (!fullTrack) return undefined
          return {
            ...fullTrack,
            trackNumber: i + 1,
          }
        })
        .filter((t) => !!t)
      return { playlist, tracks: playlistTracks }
    },
  )
  .use(createPlaylistRoutes({ db: library, fuse_playlists }))
  .listen(env.PORT, () => {
    console.log(`started in ${(performance.now() - started_at).toFixed(2)} ms`)
  })

export type App = typeof app

console.log("Spelemann running on port", env.PORT)
