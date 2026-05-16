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
import type { Album, Artist, Playlist, Track } from "@/lib/types"
import { raise } from "@/lib/utils"
import { $ } from "bun"
import { parsePlaylists } from "./server/new_playlist_parser"
import { createPlaylistRoutes } from "./playlist"
import { mkdirSync, existsSync } from "fs"
import { fuse_artists, fuse_albums, fuse_playlists, fuse_tracks } from "./lib/fuse"
import { Library, enrichmentProgress } from "./server/library"
import { SearchService } from "./server/search"
import { initDB } from "@/db"
import { sources } from "@/db/schema"
import { createLibraryRoutes } from "./server/libraries"
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

async function seedLibraries() {
  const existing = await library.getAllSources()
  if (existing.length > 0) return existing

  const rows = []
  const row1 = await db
    .insert(sources)
    .values({ name: "Default Library", rootPath: env.MUSIC_PATH, enabled: true })
    .returning()
    .then((r) => r[0])
  if (row1) {
    rows.push(row1)
    console.log("Seeded library:", row1.name, row1.rootPath)
  }

  if (env.MUSIC2_PATH) {
    const row = await db
      .insert(sources)
      .values({ name: "Secondary Library", rootPath: env.MUSIC2_PATH, enabled: true })
      .returning()
      .then((r) => r[0])
    if (row) {
      rows.push(row)
      console.log("Seeded library:", row.name, row.rootPath)
    }
  }

  return rows
}

async function reloadLibrary() {
  const libRows = await library.getAllSources()
  const enabledLibraries = libRows.filter((r) => r.enabled)

  const playlistsArr = await loadPlaylists()
  await library.setPlaylists(playlistsArr.map(p => ({ id: p.id, name: p.name, imageUrl: p.imageUrl })))
  await library.rebuildIndex()

  playlistStore.tracks = new Map((await library.getAllTracks()).map(t => [t.id, t]))
  playlistStore.playlists = new Map(playlistsArr.map(p => [p.id, { ...p, imageUrl: p.imageUrl ?? undefined }]))

  const limit = pLimit(8)
  const sourceScans = await Promise.all(
    enabledLibraries.map(async (lib) => {
      try {
        return await parse(lib.rootPath, lib.id)
      } catch (err) {
        console.error(`Error scanning library ${lib.id} (${lib.name}):`, err)
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

await seedLibraries()
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
            supportingColor: art?.supportingColor ?? undefined,
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
        supportingColor: art?.supportingColor ?? null,
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
            supportingColor: art?.supportingColor ?? null,
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
        supportingColor: art?.supportingColor ?? null,
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
    let heartbeat: ReturnType<typeof setInterval> | null = null

    const stream = new ReadableStream({
      start(controller) {
        const cleanup = () => {
          if (heartbeat) {
            clearInterval(heartbeat)
            heartbeat = null
          }
          if (unsub) {
            unsub()
            unsub = null
          }
        }

        const send = () => {
          try {
            const { completed, total } = enrichmentProgress
            controller.enqueue(
              new TextEncoder().encode(`event: progress\ndata: ${JSON.stringify({ completed, total })}\n\n`),
            )

            if (completed === total) {
              controller.enqueue(new TextEncoder().encode(`event: done\ndata: {}\n\n`))
              cleanup()
              controller.close()
            }
          } catch {
            cleanup()
          }
        }

        unsub = enrichmentProgress.listen(send)
        send()

        heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"))
          } catch {
            cleanup()
          }
        }, 10000)
      },
      cancel() {
        if (unsub) unsub()
        if (heartbeat) clearInterval(heartbeat)
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
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
        supportingColor: art?.supportingColor ?? undefined,
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
  .use(createLibraryRoutes({ library, db }))
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
