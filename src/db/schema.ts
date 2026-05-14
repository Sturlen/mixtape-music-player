import { pgTable, text, uuid, real, integer, index, uniqueIndex } from "drizzle-orm/pg-core"

export const artists = pgTable(
  "artists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stableId: text("stable_id").notNull().unique(),
    name: text("name").notNull(),
  },
  (t) => [index("idx_artists_name").on(t.name)],
)

export const albums = pgTable(
  "albums",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stableId: text("stable_id").notNull().unique(),
    name: text("name").notNull(),
    artistId: uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("idx_albums_name_artist").on(t.name, t.artistId)],
)

export const tracks = pgTable(
  "tracks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stableId: text("stable_id").notNull().unique(),
    name: text("name").notNull(),
    albumId: uuid("album_id").notNull().references(() => albums.id, { onDelete: "cascade" }),
    trackNumber: integer("track_number"),
    playtimeSeconds: real("playtime_seconds").default(0),
    path: text("path").notNull().unique(),
    artURL: text("art_url"),
  },
  (t) => [index("idx_tracks_album").on(t.albumId)],
)

export const audioAssets = pgTable(
  "audio_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stableId: text("stable_id").notNull().unique(),
    parentId: uuid("parent_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    name: text("name").notNull(),
    filetype: text("filetype").default("audio"),
    fileExt: text("file_ext"),
    duration: real("duration").default(0),
  },
  (t) => [index("idx_audio_assets_parent").on(t.parentId)],
)

export const artAssets = pgTable(
  "art_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    role: text("role").notNull().default("cover"),
    path: text("path").notNull(),
    mimeType: text("mime_type"),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    primaryColor: text("primary_color"),
    textColor: text("text_color"),
    fileExt: text("file_ext"),
  },
  (t) => [
    index("idx_art_assets_entity").on(t.entityId, t.entityType),
    index("idx_art_assets_role").on(t.entityId, t.entityType, t.role),
  ],
)

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stableId: text("stable_id").notNull().unique(),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
  },
)

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playlistId: uuid("playlist_id").notNull().references(() => playlists.id, { onDelete: "cascade" }),
    trackStableId: text("track_stable_id").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("idx_playlist_tracks_playlist").on(t.playlistId)],
)
