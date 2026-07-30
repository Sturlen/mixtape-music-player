import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "@/db/schema"
import type { DB } from "@/db"
import { Library } from "@/server/library"
import { SearchService } from "@/server/search"
import type { Album, Artist, Playlist, Track } from "@/lib/types"
import { createApp, type AppContext } from "@/index"
import {
  fuse_artists,
  fuse_albums,
  fuse_playlists,
  fuse_tracks,
} from "@/lib/fuse"
import { SignJWT } from "jose"

const TEST_JWT_SECRET = "test-secret"

export async function signTestToken(overrides?: Record<string, unknown>) {
  return await new SignJWT({
    sub: "test-user-id",
    username: "testuser",
    role: "user",
    ...overrides,
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(TEST_JWT_SECRET))
}

export async function createTestApp() {
  const pg = await PGlite.create()
  const db = drizzle(pg, { schema })
  await migrate(db, { migrationsFolder: "./drizzle" })

  fuse_artists.setCollection([])
  fuse_albums.setCollection([])
  fuse_playlists.setCollection([])
  fuse_tracks.setCollection([])

  const library = new Library(db)
  const searchService = new SearchService(library)

  const ctx: AppContext = {
    db,
    library,
    searchService,
    playlistStore: {
      tracks: new Map<string, Track>(),
      playlists: new Map<string, Playlist>(),
    },
    fuseInstances: { fuse_artists, fuse_albums, fuse_playlists, fuse_tracks },
    jwtSecret: TEST_JWT_SECRET,
    isFfmpegEnabled: async () => false,
    reloadLibrary: async () => {},
    isProduction: false,
    ready: async () => {},
  }

  const app = createApp(ctx)

  async function rebuildIndexes() {
    await library.rebuildIndex()
    searchService.buildIndex()
  }

  return { app, ctx, db, library, pg, rebuildIndexes }
}
