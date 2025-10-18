import { int, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const artistsTable = sqliteTable("artists_table", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  path: text(),
  URL: text(),
})

export const albumsTable = sqliteTable("albums_table", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  imagePath: text(), // optional
  imageURL: text(), // optional
  artistId: int()
    .notNull()
    .references(() => artistsTable.id),
})

export const tracksTable = sqliteTable("tracks_table", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  playtimeSeconds: int().notNull(),
  path: text().notNull(),
  url: text().notNull(),
  albumId: text()
    .notNull()
    .references(() => albumsTable.id),
})
