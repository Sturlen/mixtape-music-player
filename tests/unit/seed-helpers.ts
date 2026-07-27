import type { DB } from "@/db"
import {
  artists,
  albums,
  tracks,
  artAssets,
  playlists,
  playlistTracks,
  sources,
  users,
} from "@/db/schema"

let trackCounter = 0

export async function seedArtist(
  db: DB,
  overrides?: Partial<typeof artists.$inferInsert>,
) {
  const [row] = await db
    .insert(artists)
    .values({ stableId: "artist-1", name: "Test Artist", ...overrides })
    .returning()
  return row!
}

export async function seedAlbum(
  db: DB,
  artistId: string,
  overrides?: Partial<typeof albums.$inferInsert>,
) {
  const [row] = await db
    .insert(albums)
    .values({ stableId: "album-1", name: "Test Album", artistId, ...overrides })
    .returning()
  return row!
}

export async function seedTrack(
  db: DB,
  albumId: string,
  overrides?: Partial<typeof tracks.$inferInsert>,
) {
  trackCounter++
  const [row] = await db
    .insert(tracks)
    .values({
      stableId: `track-${trackCounter}`,
      name: "Test Track",
      albumId,
      playtimeSeconds: 180,
      path: `/dev/null/track-${trackCounter}.mp3`,
      ...overrides,
    })
    .returning()
  return row!
}

export async function seedArtAsset(
  db: DB,
  entityId: string,
  overrides?: Partial<typeof artAssets.$inferInsert>,
) {
  const [row] = await db
    .insert(artAssets)
    .values({
      entityId,
      entityType: "album",
      role: "cover",
      path: "/dev/null/cover.jpg",
      width: 300,
      height: 300,
      ...overrides,
    })
    .returning()
  return row!
}

export async function seedPlaylist(
  db: DB,
  overrides?: Partial<typeof playlists.$inferInsert>,
) {
  const [row] = await db
    .insert(playlists)
    .values({ stableId: "playlist-1", name: "Test Playlist", ...overrides })
    .returning()
  return row!
}

export async function seedPlaylistTrack(
  db: DB,
  playlistId: string,
  trackStableId: string,
  position: number,
) {
  const [row] = await db
    .insert(playlistTracks)
    .values({ playlistId, trackStableId, position })
    .returning()
  return row!
}

export async function seedSource(
  db: DB,
  overrides?: Partial<typeof sources.$inferInsert>,
) {
  const [row] = await db
    .insert(sources)
    .values({
      name: "Test Source",
      rootPath: "/dev/null/music",
      enabled: true,
      ...overrides,
    })
    .returning()
  return row!
}

export async function seedUser(
  db: DB,
  overrides?: Partial<typeof users.$inferInsert>,
) {
  const passwordHash = await Bun.password.hash("password123")
  const [row] = await db
    .insert(users)
    .values({ username: "testuser", passwordHash, role: "user", ...overrides })
    .returning()
  return row!
}
