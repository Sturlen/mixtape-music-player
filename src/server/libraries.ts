import { Elysia, t } from "elysia"
import pLimit from "p-limit"
import { eq, sql } from "drizzle-orm"
import { sources } from "@/db/schema"
import type { DB } from "@/db"
import type { Library } from "@/server/library"
import { parse } from "@/parse"

interface LibraryContext {
  library: Library
  db: DB
}

export function createLibraryRoutes(context: LibraryContext) {
  const { library, db } = context

  return new Elysia({ prefix: "/api/libraries" })
    .get("", async () => {
      const rows = await library.getAllSources()
      return { libraries: rows }
    })
    .get("/:id", async ({ params: { id }, status }) => {
      const row = await library.getSource(id)
      if (!row) return status(404)
      return { library: row }
    })
    .post(
      "",
      async ({ body: { name, rootPath }, status }) => {
        const [row] = await db
          .insert(sources)
          .values({ name, rootPath, enabled: true })
          .returning()
        if (!row) return status(500)
        scanLibrary(library, row.id, row.rootPath)
        return { library: row }
      },
      {
        body: t.Object({
          name: t.String(),
          rootPath: t.String(),
        }),
      },
    )
    .put(
      "/:id",
      async ({ params: { id }, body: { name, rootPath, enabled }, status }) => {
        const existing = await library.getSource(id)
        if (!existing) return status(404)

        const [row] = await db
          .update(sources)
          .set({
            name: name ?? existing.name,
            rootPath: rootPath ?? existing.rootPath,
            enabled: enabled ?? existing.enabled,
            updatedAt: new Date(),
          })
          .where(eq(sources.id, id))
          .returning()
        if (!row) return status(500)
        return { library: row }
      },
      {
        body: t.Object({
          name: t.Optional(t.String()),
          rootPath: t.Optional(t.String()),
          enabled: t.Optional(t.Boolean()),
        }),
      },
    )
    .delete("/:id", async ({ params: { id }, status }) => {
      const existing = await library.getSource(id)
      if (!existing) return status(404)

      await library.deleteTracksBySource(id)
      await db.delete(sources).where(eq(sources.id, id))
      await db.execute(
        sql`DELETE FROM albums WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks)`,
      )
      await db.execute(
        sql`DELETE FROM artists WHERE id NOT IN (SELECT DISTINCT artist_id FROM albums)`,
      )
      await library.rebuildIndex()
      return { success: true }
    })
    .post("/:id/scan", async ({ params: { id }, status }) => {
      const lib = await library.getSource(id)
      if (!lib) return status(404)

      scanLibrary(library, lib.id, lib.rootPath)
      return { success: true }
    })
}

function scanLibrary(library: Library, sourceId: string, rootPath: string) {
  const limit = pLimit(8)
  parse(rootPath, sourceId)
    .then((scanResult) => {
      library.enrich(limit, [scanResult])
    })
    .catch((err) => {
      console.error("Error scanning library", sourceId, err)
    })
}
