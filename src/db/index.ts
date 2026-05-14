import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "./schema"

export type DB = ReturnType<typeof drizzle<typeof schema>>

declare global {
  var __mixtape_pglite: { db: DB; pg: PGlite } | undefined
}

export async function initDB(dataDir: string): Promise<{ db: DB; pg: PGlite }> {
  if (globalThis.__mixtape_pglite) return globalThis.__mixtape_pglite

  const pg = await PGlite.create(dataDir)
  const db = drizzle(pg, { schema })
  await migrate(db, { migrationsFolder: "./drizzle" })

  globalThis.__mixtape_pglite = { db, pg }
  return globalThis.__mixtape_pglite
}
