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
import { fuse_artists, fuse_albums, fuse_playlists, fuse_tracks } from "./lib/fuse"
import { Library, enrichmentProgress } from "./server/library"
import { SearchService } from "./server/search"
import { initDB } from "@/db"
import { createServer, LogLevel } from "pglite-server"

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

const pgliteDir = env.DATA_PATH + "/pglite"
const { db, pg } = await initDB(pgliteDir)
const library = new Library(db)
const searchService = new SearchService(library)
library.onIndexRebuilt = () => searchService.buildIndex()
const playlistStore = {
  tracks: new Map<string, Track>(),
  playlists: new Map<string, Playlist>(),
}

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
  const playlistsArr = await loadPlaylists()
  await library.setPlaylists(playlistsArr.map(p => ({ id: p.id, name: p.name, imageUrl: p.imageUrl })))
  await library.rebuildIndex()

  playlistStore.tracks = new Map((await library.getAllTracks()).map(t => [t.id, t]))
  playlistStore.playlists = new Map(playlistsArr.map(p => [p.id, { ...p, imageUrl: p.imageUrl ?? undefined }]))

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

  const stats = await library.getStats()
  console.log("Library reloaded — enrichment in background", stats)
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
  .get("/api/stats", async () => await library.getStats())
  .get(
    "/api/search",
    async ({ query: { q } }) => {
      return searchService.search(q ?? "")
    },
    { detail: "Search artists, albums, tracks", query: t.Object({ q: t.String() }) },
  )
  .get(
    "/api/artists",
    async ({ query: { q } }) => {
      let artists: Artist[]
      if (q) {
        console.log("q", q)
        artists = fuse_artists
          .search(q)
          .map((res: { item: Artist }) => res.item) as unknown as Artist[]
      } else {
        artists = await library.getArtists()
      }
      const enriched = await Promise.all(
        artists.map(async (a) => {
          const art = await library.getArt(a.id, "artist", "portrait")
          return {
            id: a.id,
            name: a.name,
            imageURL: `/api/files/artistart/${a.id}`,
            primaryColor: art?.primaryColor ?? undefined,
            textColor: art?.textColor ?? undefined,
          }
        }),
      )
      return enriched.sort((a, b) => a.name.localeCompare(b.name))
    },
    {
      detail: "Get artists",
      query: t.Object({ q: t.Optional(t.String()) }),
    },
  )
  .get("/api/artists/:artistId", async ({ params: { artistId } }) => {
    const [artist, art] = await Promise.all([
      library.getArtist(artistId),
      library.getArt(artistId, "artist", "portrait"),
    ])
    if (!artist) return { artist: null }
    const artistAlbums = await library.getArtistAlbums(artistId)
    const albumsWithArt = artistAlbums.map((album) => ({
      ...album,
      imageURL: `/api/files/albumart/${album.id}`,
    }))
    return {
      artist: {
        ...artist,
        imageURL: `/api/files/artistart/${artistId}`,
        primaryColor: art?.primaryColor ?? null,
        textColor: art?.textColor ?? null,
        albums: albumsWithArt,
      },
    }
  })
  .get(
    "/api/albums",
    async ({ query: { q } }) => {
      let albums: Album[] = []
      if (q) {
        console.log("q", q)
        albums = fuse_albums.search(q).map((res: { item: Album }) => res.item) as unknown as Album[]
      } else {
        albums = await library.getAlbums()
      }
      const enriched = await Promise.all(
        albums.map(async (album) => {
          const [artist, art] = await Promise.all([
            library.getArtist(album.artistId),
            library.getArt(album.id, "album", "cover"),
          ])
          return {
            id: album.id,
            name: album.name,
            artistId: album.artistId,
            artistName: artist?.name ?? null,
            primaryColor: art?.primaryColor ?? null,
            textColor: art?.textColor ?? null,
            imageURL: `/api/files/albumart/${album.id}`,
          }
        }),
      )
      return { albums: enriched.sort((a, b) => a.name.localeCompare(b.name)) }
    },
    { detail: "Get albums", query: t.Object({ q: t.Optional(t.String()) }) },
  )
  .get("/api/albums/:albumId", async ({ params: { albumId } }) => {
    const [album, art] = await Promise.all([
      library.getAlbum(albumId),
      library.getArt(albumId, "album", "cover"),
    ])
    if (!album) return { album: null }
    const artist = await library.getArtist(album.artistId)
    const albumTracks = await library.getAlbumTracks(albumId)
    const imageURL = `/api/files/albumart/${album.id}`
    const tracks = albumTracks
      .map((tr) => ({
        id: tr.id,
        name: tr.name,
        albumId: tr.albumId,
        trackNumber: tr.trackNumber,
        playtimeSeconds: tr.playtimeSeconds ?? 0,
        path: tr.path,
        artURL: imageURL,
      }))
      .sort(compareTracksByNumberName)

    return {
      album: {
        id: album.id,
        name: album.name,
        artistId: album.artistId,
        artistName: artist?.name ?? null,
        primaryColor: art?.primaryColor ?? null,
        textColor: art?.textColor ?? null,
        imageURL,
        tracks,
      },
    }
  })
  .get("/api/tracks", async () => await library.getAllTracks())
  .get("/api/tracks/:trackId", async ({ params: { trackId } }) => await library.getTrack(trackId))
  .get(
    "/api/files/artistart/:artistId",
    async ({ params: { artistId }, query, set, status }) => {
      const art = await library.getArt(artistId, "artist", "portrait")
      if (!art) { console.error("artist art not found for", artistId); return status(404) }
      const file = Bun.file(art.path)
      set.headers["Content-Type"] = file.type
      set.headers["Cache-Control"] = "public, max-age=86400"
      return file
    },
  )
  .get(
    "/api/files/albumart/:albumId",
    async ({ params: { albumId }, query, set }) => {
      const art = await library.getArt(albumId, "album", "cover")
      if (!art) throw new NotFoundError()
      const file = Bun.file(art.path)
      set.headers["Content-Type"] = file.type
      set.headers["Cache-Control"] = "public, max-age=86400"
      return file
    },
  )
  .get("/api/files/track/:trackId", async ({ params: { trackId } }) => {
    try {
      const track = await library.getTrack(trackId)
      if (!track) throw new NotFoundError()
      return Bun.file(track.path)
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/assets", async () => {
    try {
      const assets = await library.getAudioAssets()
      return { assets }
    } catch (err) {
      throw new NotFoundError()
    }
  })
  .get("/api/assets/:assetId", async ({ params: { assetId }, set, status }) => {
    const asset = await library.getAudioAsset(assetId)
    if (!asset) return status(404, "Asset not found")
    if (env.USE_FFMPEG) {
      let ffmpeg_stderr = ""
      try {
        const start = performance.now()
        const proc = await $`ffmpeg -i ${asset?.path ?? ""} -f mp3 -vn -q:a 1 pipe:1`.quiet()
        ffmpeg_stderr = proc.stderr.toString()
        set.headers["content-type"] = "audio/mpeg"
        const end = performance.now()
        console.log("ffmpeg took %ds for file '%s'", (end - start) / 1000, asset.name)
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
  .get("/api/library/progress", () => {
    let unsub: (() => void) | null = null

    const stream = new ReadableStream({
      start(controller) {
        const send = () => {
          const data = JSON.stringify({
            completed: enrichmentProgress.completed,
            total: enrichmentProgress.total,
          })
          controller.enqueue(new TextEncoder().encode(`event: progress\ndata: ${data}\n\n`))
        }

        unsub = enrichmentProgress.listen(send)
        send()
      },
      cancel() {
        unsub?.()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  })
  .post("/api/libary/reload", async () => await reloadLibrary(), {
    detail: { description: "Reloads the internal db and parses all sources again" },
  })
  .post(
    "/api/player",
    async ({ body: { trackId }, status }) => {
      if (!trackId) return status("Bad Request")
      const track = await library.getTrack(trackId)
      if (!track) return status("Not Found")
      const audio_assets = await library.getAudioAssetsByParent(trackId)
      console.log("audio assets found: ", audio_assets)
      const main_asset = audio_assets[0]
      if (!main_asset) { console.log("No audio asset found"); return status(404) }
      console.log("playback started ", track.id)
      return { url: `/api/assets/${main_asset.id}` }
    },
    { body: t.Object({ trackId: t.String() }) },
  )
  .post("/api/playAlbum/:albumId", async ({ params: { albumId }, status }) => {
    const [album, art] = await Promise.all([
      library.getAlbum(albumId),
      library.getArt(albumId, "album", "cover"),
    ])
    if (!album) return status(404)
    const albumTracks = await library.getAlbumTracks(albumId)
    const sorted = albumTracks.sort(compareTracksByNumberName)
    console.log("playAlbum requested for album", albumId, "tracks:", sorted.length)
    return {
      album: {
        ...album,
        imageURL: `/api/files/albumart/${albumId}`,
        primaryColor: art?.primaryColor ?? undefined,
        textColor: art?.textColor ?? undefined,
      },
      tracks: sorted,
    }
  })
  .post(
    "/api/playPlaylist/:playlistId",
    async ({ params: { playlistId }, status }) => {
      const playlist = await library.getPlaylist(playlistId)
      if (!playlist) return status(404)
      const playlistTracks = [] as Track[]
      return { playlist, tracks: playlistTracks }
    },
  )
  .use(createPlaylistRoutes({ db: playlistStore, fuse_playlists }))
  .listen(env.PORT, () => {
    console.log(`started in ${(performance.now() - started_at).toFixed(2)} ms`)

    if (env.PG_PORT) {
      const pgServer = createServer(pg, { logLevel: LogLevel.Info })
      pgServer.listen(env.PG_PORT, () => {
        console.log("PGlite exposed on port", env.PG_PORT)
      })
    }
  })

export type App = typeof app

console.log("Spelemann running on port", env.PORT)
