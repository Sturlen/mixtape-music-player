import { env } from "@/shared/env"
import { initDB } from "@/db"
import { eq } from "drizzle-orm"
import pLimit from "p-limit"
import { sources, users, settings } from "@/db/schema"
import { parse } from "@/parse"
import { parsePlaylists } from "./server/new_playlist_parser"
import { Library } from "./server/library"
import { SearchService } from "./server/search"
import { preencodeTracks, startStreamCleanup } from "@/server/stream"
import { createServer, LogLevel } from "pglite-server"
import { mkdirSync, existsSync } from "fs"
import {
  fuse_artists,
  fuse_albums,
  fuse_playlists,
  fuse_tracks,
} from "./lib/fuse"
import type { Playlist, Track } from "@/lib/types"
import { createApp, type AppContext } from "./index"

let resolveReady: (() => void) | null = null
const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve
})

const started_at = performance.now()

if (env.USE_FFMPEG) {
  console.warn(
    Bun.color("yellow", "ansi") +
      "FFMPEG audio file conversion is enabled. if you are experiencing issues, try setting USE_FFMPEG=0 disable it.",
  )
  console.warn(Bun.color("white", "ansi"))
}

if (env.HLS_ENABLED) {
  console.warn(
    Bun.color("yellow", "ansi") +
      "HLS streaming is enabled. Audio files will be transcoded via FFmpeg on first play.",
  )
  console.warn(Bun.color("white", "ansi"))
}

const pgliteDir = env.DATA_PATH + "/pglite"
const { db, pg } = await initDB(pgliteDir)

const library = new Library(db)
const searchService = new SearchService(library)
library.onIndexRebuilt = () => searchService.buildIndex()
library.onEnrichmentComplete = async () => {
  if (env.HLS_ENABLED) {
    const allTracks = (await library.getAllTracks()).map((t) => ({
      id: t.id,
      path: t.path,
    }))
    await preencodeTracks(allTracks)
  }
  resolveReady?.()
}

const playlistStore = {
  tracks: new Map<string, Track>(),
  playlists: new Map<string, Playlist>(),
}

async function isFfmpegEnabled(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "ffmpeg_enabled"))
    .limit(1)
  return row ? row.value === "true" : env.USE_FFMPEG
}

let jwtSecret: string
if (env.JWT_SECRET) {
  jwtSecret = env.JWT_SECRET
  console.log("Using JWT_SECRET from environment variable")
} else {
  const [stored] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "jwt_secret"))
    .limit(1)
  if (stored) {
    jwtSecret = stored.value
  } else {
    jwtSecret = crypto.randomUUID() + crypto.randomUUID()
    await db.insert(settings).values({ key: "jwt_secret", value: jwtSecret })
    console.log("Generated and stored JWT secret in database")
  }
}

const existingUsers = await db.select().from(users).limit(1)
if (existingUsers.length === 0 && env.ADMIN_USERNAME && env.ADMIN_PASSWORD) {
  const passwordHash = await Bun.password.hash(env.ADMIN_PASSWORD)
  await db
    .insert(users)
    .values({ username: env.ADMIN_USERNAME, passwordHash, role: "admin" })
    .onConflictDoNothing()
  console.log(
    `Admin user "${env.ADMIN_USERNAME}" created from environment variables`,
  )
}

async function loadPlaylists(): Promise<Playlist[]> {
  const playlistsPath = `${env.DATA_PATH}/playlists`
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
    .values({
      name: "Default Library",
      rootPath: env.MUSIC_PATH,
      enabled: true,
    })
    .returning()
    .then((r) => r[0])
  if (row1) {
    rows.push(row1)
    console.log("Seeded library:", row1.name, row1.rootPath)
  }
  if (env.MUSIC2_PATH) {
    const row = await db
      .insert(sources)
      .values({
        name: "Secondary Library",
        rootPath: env.MUSIC2_PATH,
        enabled: true,
      })
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
  await library.setPlaylists(
    playlistsArr.map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl })),
  )
  await library.rebuildIndex()
  playlistStore.tracks = new Map(
    (await library.getAllTracks()).map((t) => [t.id, t]),
  )
  playlistStore.playlists = new Map(
    playlistsArr.map((p) => [
      p.id,
      { ...p, imageUrl: p.imageUrl ?? undefined },
    ]),
  )
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

const isProduction = process.env.NODE_ENV === "production"

const app = createApp({
  db,
  library,
  searchService,
  playlistStore,
  fuseInstances: { fuse_artists, fuse_albums, fuse_playlists, fuse_tracks },
  jwtSecret,
  isFfmpegEnabled,
  reloadLibrary,
  isProduction,
  ready: async () => await readyPromise,
})

app.listen(env.PORT, () => {
  console.log(`started in ${(performance.now() - started_at).toFixed(2)} ms`)

  if (env.PG_PORT) {
    const pgServer = createServer(pg, { logLevel: LogLevel.Info })
    pgServer.listen(env.PG_PORT, () => {
      console.log("PGlite exposed on port", env.PG_PORT)
    })
  }

  if (env.HLS_ENABLED) {
    startStreamCleanup()
  }
})

console.log("Spelemann running on port", env.PORT)
