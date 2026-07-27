import Elysia, { NotFoundError, redirect, t } from "elysia"
import { openapi, fromTypes } from "@elysiajs/openapi"
import { opentelemetry } from "@elysiajs/opentelemetry"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"
import { staticPlugin } from "@elysiajs/static"
import { jwt } from "@elysiajs/jwt"
import { readFileSync, existsSync } from "fs"
import { $ } from "bun"
import type Fuse from "fuse.js"
import { env } from "@/shared/env"
import { getStreamPath } from "@/server/stream"
import type { Album, Artist, Playlist, Track } from "@/lib/types"
import { compareTracksByNumberName } from "@/lib/utils"
import { createPlaylistRoutes } from "./playlist"
import { createAuthRoutes } from "./server/auth"
import { createAdminRoutes } from "./server/admin"
import { verifyAuth } from "./server/guard"
import { type Library, enrichmentProgress } from "./server/library"
import type { SearchService } from "./server/search"
import type { DB } from "@/db"
import { createLibraryRoutes } from "./server/libraries"

export interface AppContext {
  db: DB
  library: Library
  searchService: SearchService
  playlistStore: {
    tracks: Map<string, Track>
    playlists: Map<string, Playlist>
  }
  fuseInstances: {
    fuse_artists: Fuse<Artist>
    fuse_albums: Fuse<Album>
    fuse_playlists: Fuse<Playlist>
    fuse_tracks: Fuse<Track>
  }
  jwtSecret: string
  isFfmpegEnabled: () => Promise<boolean>
  reloadLibrary: () => Promise<void>
  isProduction: boolean
}

export function createApp(ctx: AppContext) {
  const {
    db,
    library,
    searchService,
    playlistStore,
    fuseInstances,
    jwtSecret,
    isFfmpegEnabled,
    reloadLibrary,
    isProduction,
  } = ctx
  const { fuse_artists, fuse_albums, fuse_playlists, fuse_tracks } =
    fuseInstances

  const app = new Elysia()
    .onError(({ error, code, status }) => {
      if (code === "NOT_FOUND") return status(404)
      if (code === "VALIDATION") return status(422)
      const statusCode = Number(code)
      if (!isNaN(statusCode)) return status(statusCode)
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
    .use(openapi({ path: "/openapi", references: fromTypes() }))
    .use(jwt({ secret: jwtSecret }))
    .get("/api/*", "418")
    .get("/api", () => redirect("/openapi"))
    .get("/api/stats", async () => await library.getStats())
    .get(
      "/api/search",
      async ({ query: { q } }) => searchService.search(q ?? ""),
      {
        detail: "Search artists, albums, tracks",
        query: t.Object({ q: t.String() }),
      },
    )
    .get(
      "/api/artists",
      async ({ query: { q } }) => {
        let artists: Artist[]
        if (q) {
          artists = fuse_artists
            .search(q)
            .map((res) => res.item) as unknown as Artist[]
        } else {
          artists = await library.getArtists()
        }
        const artMap = await library.getArtBatch(
          artists.map((a) => a.id),
          "artist",
          "portrait",
        )
        const enriched = artists.map((a) => {
          const art = artMap.get(a.id)
          return {
            id: a.id,
            name: a.name,
            ...(art ? { imageURL: `/api/files/artistart/${a.id}` } : {}),
            primaryColor: art?.primaryColor ?? undefined,
            textColor: art?.textColor ?? undefined,
            supportingColor: art?.supportingColor ?? undefined,
          }
        })
        return enriched.sort((a, b) => a.name.localeCompare(b.name))
      },
      { detail: "Get artists", query: t.Object({ q: t.Optional(t.String()) }) },
    )
    .get("/api/artists/:artistId", async ({ params: { artistId } }) => {
      const [artist, art] = await Promise.all([
        library.getArtist(artistId),
        library.getArt(artistId, "artist", "portrait"),
      ])
      if (!artist) return { artist: null }
      const artistAlbums = await library.getArtistAlbums(artistId)
      const albumArtMap = await library.getArtBatch(
        artistAlbums.map((a) => a.id),
        "album",
        "cover",
      )
      const albumsWithArt = artistAlbums.map((album) => {
        const albumArt = albumArtMap.get(album.id)
        return {
          ...album,
          ...(albumArt ? { imageURL: `/api/files/albumart/${album.id}` } : {}),
          primaryColor: albumArt?.primaryColor ?? null,
          textColor: albumArt?.textColor ?? null,
          supportingColor: albumArt?.supportingColor ?? null,
        }
      })
      return {
        artist: {
          ...artist,
          ...(art ? { imageURL: `/api/files/artistart/${artistId}` } : {}),
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
          albums = fuse_albums
            .search(q)
            .map((res) => res.item) as unknown as Album[]
        } else {
          albums = await library.getAlbums()
        }
        const artistsForAlbums = await library.getArtists()
        const artistNameMap = new Map(
          artistsForAlbums.map((a) => [a.id, a.name]),
        )
        const artMap = await library.getArtBatch(
          albums.map((a) => a.id),
          "album",
          "cover",
        )
        const enriched = albums.map((album) => {
          const art = artMap.get(album.id)
          return {
            id: album.id,
            name: album.name,
            artistId: album.artistId,
            artistName: artistNameMap.get(album.artistId) ?? null,
            ...(art ? { imageURL: `/api/files/albumart/${album.id}` } : {}),
            primaryColor: art?.primaryColor ?? null,
            textColor: art?.textColor ?? null,
            supportingColor: art?.supportingColor ?? null,
          }
        })
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
      const tracks = albumTracks
        .map((tr) => ({
          id: tr.id,
          name: tr.name,
          albumId: tr.albumId,
          trackNumber: tr.trackNumber,
          playtimeSeconds: tr.playtimeSeconds ?? 0,
          path: tr.path,
          ...(art ? { artURL: `/api/files/albumart/${album.id}` } : {}),
        }))
        .sort(compareTracksByNumberName)
      return {
        album: {
          id: album.id,
          name: album.name,
          artistId: album.artistId,
          artistName: artist?.name ?? null,
          ...(art ? { imageURL: `/api/files/albumart/${album.id}` } : {}),
          primaryColor: art?.primaryColor ?? null,
          textColor: art?.textColor ?? null,
          supportingColor: art?.supportingColor ?? null,
          tracks,
        },
      }
    })
    .get("/api/tracks", async () => await library.getAllTracks())
    .get(
      "/api/tracks/:trackId",
      async ({ params: { trackId } }) => await library.getTrack(trackId),
    )
    .get(
      "/api/files/artistart/:artistId",
      async ({ params: { artistId }, set, status }) => {
        const art = await library.getArt(artistId, "artist", "portrait")
        if (!art) return status(404)
        const file = Bun.file(art.path)
        set.headers["Content-Type"] = file.type
        set.headers["Cache-Control"] = "public, max-age=86400"
        return file
      },
    )
    .get(
      "/api/files/albumart/:albumId",
      async ({ params: { albumId }, set }) => {
        const art = await library.getArt(albumId, "album", "cover")
        if (!art) throw new NotFoundError()
        const file = Bun.file(art.path)
        set.headers["Content-Type"] = file.type
        set.headers["Cache-Control"] = "public, max-age=86400"
        return file
      },
    )
    .get("/api/files/track/:trackId", async ({ params: { trackId } }) => {
      const track = await library.getTrack(trackId)
      if (!track) throw new NotFoundError()
      return Bun.file(track.path)
    })
    .get("/api/assets", async () => {
      const assets = await library.getAudioAssets()
      return { assets }
    })
    .get(
      "/api/assets/:assetId",
      async ({ params: { assetId }, set, status }) => {
        const asset = await library.getAudioAsset(assetId)
        if (!asset) return status(404, "Asset not found")
        if (await isFfmpegEnabled()) {
          let ffmpeg_stderr = ""
          try {
            const start = performance.now()
            const proc =
              await $`ffmpeg -i ${asset?.path ?? ""} -f mp3 -vn -q:a 1 pipe:1`.quiet()
            ffmpeg_stderr = proc.stderr.toString()
            set.headers["content-type"] = "audio/mpeg"
            console.log(
              "ffmpeg took %ds for file '%s'",
              (performance.now() - start) / 1000,
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
      },
    )
    .get(
      "/api/stream/:trackId",
      async ({ params: { trackId }, set, status }) => {
        if (!env.HLS_ENABLED) return status(404, "Streaming disabled")
        const streamPath = getStreamPath(trackId)
        if (existsSync(streamPath)) return Bun.file(streamPath)
        const track = await library.getTrack(trackId)
        if (!track) return status(404, "Track not found")
        const assets = await library.getAudioAssetsByParent(trackId)
        const asset = assets[0]
        if (!asset) return status(404, "No audio asset")
        return Bun.file(asset.path)
      },
    )
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
                new TextEncoder().encode(
                  `event: progress\ndata: ${JSON.stringify({ completed, total })}\n\n`,
                ),
              )
              if (completed === total) {
                controller.enqueue(
                  new TextEncoder().encode("event: done\ndata: {}\n\n"),
                )
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
    .use(createAuthRoutes({ db, jwtSecret }))
    .use(createAdminRoutes({ db, jwtSecret }))
    .use(createPlaylistRoutes({ db: playlistStore, fuse_playlists }))
    .use(createLibraryRoutes({ library, db }))
    .post(
      "/api/libary/reload",
      async ({ jwt, headers, status }) => {
        const user = await verifyAuth(jwt, headers)
        if (!user) throw status(401, "Authentication required")
        return await reloadLibrary()
      },
      {
        detail: {
          description: "Reloads the internal db and parses all sources again",
        },
      },
    )
    .post(
      "/api/player",
      async ({ body: { trackId }, jwt, headers, status }) => {
        const user = await verifyAuth(jwt, headers)
        if (!user) throw status(401, "Authentication required")
        if (!trackId) return status("Bad Request")
        const track = await library.getTrack(trackId)
        if (!track) return status("Not Found")
        const audio_assets = await library.getAudioAssetsByParent(trackId)
        const main_asset = audio_assets[0]
        if (!main_asset) return status(404)
        return { url: `/api/assets/${main_asset.id}` }
      },
      { body: t.Object({ trackId: t.String() }) },
    )
    .post(
      "/api/playAlbum/:albumId",
      async ({ params: { albumId }, jwt, headers, status }) => {
        const user = await verifyAuth(jwt, headers)
        if (!user) throw status(401, "Authentication required")
        const [album, art] = await Promise.all([
          library.getAlbum(albumId),
          library.getArt(albumId, "album", "cover"),
        ])
        if (!album) return status(404)
        const albumTracks = await library.getAlbumTracks(albumId)
        const sorted = albumTracks.sort(compareTracksByNumberName)
        return {
          album: {
            ...album,
            ...(art ? { imageURL: `/api/files/albumart/${albumId}` } : {}),
            primaryColor: art?.primaryColor ?? undefined,
            textColor: art?.textColor ?? undefined,
            supportingColor: art?.supportingColor ?? undefined,
          },
          tracks: sorted,
        }
      },
    )
    .post(
      "/api/playPlaylist/:playlistId",
      async ({ params: { playlistId }, jwt, headers, status }) => {
        const user = await verifyAuth(jwt, headers)
        if (!user) throw status(401, "Authentication required")
        const playlist = await library.getPlaylist(playlistId)
        if (!playlist) return status(404)
        return { playlist, tracks: [] }
      },
    )

  if (isProduction) {
    const distIndexHtml = readFileSync("./dist/index.html", "utf-8")
    app.use(
      staticPlugin({
        assets: "./dist/assets",
        prefix: "/assets",
        indexHTML: false,
      }),
    )
    app.get("/*", distIndexHtml)
  } else {
    app.get("/*", "Vite dev server running on http://localhost:5173", {})
  }

  return app
}

export type App = ReturnType<typeof createApp>
