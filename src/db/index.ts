import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const usersTable = sqliteTable("users_table", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  age: int().notNull(),
  email: text().notNull().unique(),
})
export function initalizeDB(connection: string) {
  const sqlite = new Database(connection)
  const db = drizzle({ client: sqlite })
  //   const result = await db.select().from()
  return db
}
