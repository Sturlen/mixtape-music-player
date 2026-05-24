import type { LimitFunction } from "p-limit"
import path from "path"
import { eq, and, sql, inArray } from "drizzle-orm"
import type { DB } from "@/db"
import { artists, albums, tracks, audioAssets, artAssets, playlists, playlistTracks, sources } from "@/db/schema"
import type { AudioMetadata } from "@/server/audio"
import type { Artist, Album, Track, AudioAsset, ArtAsset, Playlist } from "@/lib/types"
import { createMetadataProvider } from "@/server/audio"
import { artInfo } from "@/lib/dominant-color"
import { fuse_artists, fuse_albums, fuse_playlists } from "@/lib/fuse"
import type { ScanResult } from "./scanner"

function stableId(prefix: string, value: string): string {
  return prefix + Bun.hash(`${prefix}_${value}`).toString(16)
}

function trackNameFromFile(filepath: string): string {
  const base = path.basename(filepath).replace(/\.[^/.]+$/, "")
  const numbered = base.match(/^(?:\d+\s)?(.+)$/)
  return numbered ? numbered[1]!.trim() : base
}

export class EnrichmentProgress {
  completed = 0
  total = 0
  private listeners: Set<() => void> = new Set()

  listen(cb: () => void) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notify() {
    for (const cb of this.listeners) cb()
  }

  reset(total: number) {
    this.completed = 0
    this.total = total
    this.notify()
  }

  tick() {
    this.completed++
    this.notify()
  }
}

export const enrichmentProgress = new EnrichmentProgress()

export class Library {
  onIndexRebuilt?: () => Promise<void>

  constructor(private db: DB) {}

  async clear() {
    await this.db.delete(playlistTracks)
    await this.db.delete(playlists)
    await this.db.delete(audioAssets)
    await this.db.delete(artAssets)
    await this.db.delete(tracks)
    await this.db.delete(albums)
    await this.db.delete(artists)
  }

  private async upsertArtist(name: string): Promise<string> {
    const sid = stableId("artist", name)
    const [row] = await this.db
      .insert(artists)
      .values({ stableId: sid, name })
      .onConflictDoNothing({ target: artists.stableId })
      .returning({ id: artists.id })
    if (row) return row.id

    const [existing] = await this.db
      .select({ id: artists.id })
      .from(artists)
      .where(eq(artists.stableId, sid))
      .limit(1)
    return existing!.id
  }

  private async upsertAlbum(name: string, artistId: string, year?: number): Promise<{ id: string }> {
    const sid = stableId("album", `${name}_${artistId}`)
    const albumId = crypto.randomUUID()

    const [row] = await this.db
      .insert(albums)
      .values({ id: albumId, stableId: sid, name, artistId, year: year ?? null })
      .onConflictDoNothing({ target: albums.stableId })
      .returning({ id: albums.id, year: albums.year })
    if (row) return { id: row.id }

    const [existing] = await this.db
      .select({ id: albums.id })
      .from(albums)
      .where(eq(albums.stableId, sid))
      .limit(1)
    return { id: existing!.id }
  }

  private async insertArt(
    entityId: string,
    entityType: "album" | "artist",
    role: "cover" | "portrait",
    filePath: string,
  ): Promise<void> {
    const existing = await this.db
      .select({ id: artAssets.id })
      .from(artAssets)
      .where(and(eq(artAssets.entityId, entityId), eq(artAssets.entityType, entityType), eq(artAssets.role, role)))
      .limit(1)
      .then((r) => r[0])

    const info = await artInfo(filePath)
    if (!info) return

    if (existing) {
      await this.db
        .update(artAssets)
        .set({
          width: info.width,
          height: info.height,
          primaryColor: info.hex,
          textColor: info.textColor,
          supportingColor: info.supportingColor,
        })
        .where(eq(artAssets.id, existing.id))
      return
    }

    await this.db.insert(artAssets).values({
      id: crypto.randomUUID(),
      entityId,
      entityType,
      role,
      path: filePath,
      mimeType: `image/${path.extname(filePath).slice(1)}`,
      width: info.width,
      height: info.height,
      primaryColor: info.hex,
      textColor: info.textColor,
      supportingColor: info.supportingColor,
      fileExt: path.extname(filePath).toLowerCase(),
    })
  }

  async addFromMetadata(
    filePath: string,
    info: AudioMetadata,
    artByDir: Map<string, string>,
    sourceRoot: string,
    sourceId?: string,
  ): Promise<void> {
    const dir = path.dirname(filePath)
    const relDir = path.relative(sourceRoot, dir)
    const parts = relDir.split(path.sep)

    const dirArtist = parts.length > 0 ? parts[0] : undefined
    const artistFromList = info.artistName?.split(",")[0]?.trim()
    const artistName =
      dirArtist || info.albumArtistName || artistFromList || "Unknown Artist"
    const rawAlbum =
      info.albumName || (parts.length > 1 ? parts[1] : undefined) || "Unknown Album"
    const albumName = rawAlbum.split(" - ").at(-1)?.trim() ?? rawAlbum
    const title = info.trackName || trackNameFromFile(filePath)
    const duration = info.durationSeconds.toJSON()

    const artistId = await this.upsertArtist(artistName)

    const album = await this.upsertAlbum(albumName, artistId, info.year)

    const trackSid = stableId("track", `${artistName}/${albumName}/${title}`)
    const existingTrack = await this.db
      .select({ id: tracks.id })
      .from(tracks)
      .where(eq(tracks.stableId, trackSid))
      .limit(1)
      .then((r) => r[0])
    if (existingTrack) return

    const [trackRow] = await this.db
      .insert(tracks)
      .values({
        stableId: trackSid,
        name: title,
        albumId: album.id,
        sourceId: sourceId ?? null,
        trackNumber: info.trackNumber,
        playtimeSeconds: duration,
        path: filePath,
      })
      .returning({ id: tracks.id })

    const assetSid = stableId("asset", filePath)
    await this.db
      .insert(audioAssets)
      .values({
        stableId: assetSid,
        parentId: trackRow!.id,
        path: filePath,
        name: path.basename(filePath),
        fileExt: path.extname(filePath).toLowerCase(),
        duration,
      })
      .onConflictDoNothing({ target: audioAssets.stableId })

    const albumArt = artByDir.get(dir)
    if (albumArt) {
      await this.insertArt(album.id, "album", "cover", albumArt)
    }

    if (dirArtist) {
      const aArt = artByDir.get(path.join(sourceRoot, dirArtist))
      if (aArt) {
        await this.insertArt(artistId, "artist", "portrait", aArt)
      }
    }
  }

  enrich(limit: LimitFunction, sources: { scan: ScanResult; rootPath: string; sourceId: string }[]) {
    const provider = createMetadataProvider()

    const allFiles: { path: string; rootPath: string; sourceId: string }[] = []
    const artByDir = new Map<string, string>()

    for (const { scan, rootPath, sourceId } of sources) {
      for (const f of scan.audioFiles) allFiles.push({ path: f.path, rootPath, sourceId })
      for (const [dir, img] of scan.artByDir) {
        if (!artByDir.has(dir)) artByDir.set(dir, img)
      }
    }

    enrichmentProgress.reset(allFiles.length)

    const jobs = allFiles.map(({ path, rootPath, sourceId }) =>
      limit(async () => {
        try {
          const info = await provider.getMetadata(path)
          await this.addFromMetadata(path, info, artByDir, rootPath, sourceId)
        } catch {
          // skip unparseable files
        }
        enrichmentProgress.tick()
      }),
    )

    Promise.allSettled(jobs).then(() => {
      this.rebuildIndex()
      console.log(
        "Metadata complete: from %d files",
        allFiles.length,
      )
    })
  }

  // Convert DB rows (with null) to domain types (with undefined)
  private fix<T>(row: T): T {
    if (!row || typeof row !== 'object') return row
    const out = {} as T
    for (const [k, v] of Object.entries(row)) {
      ;(out as any)[k] = v ?? undefined
    }
    return out
  }

  private fixMany<T>(rows: T[]): T[] {
    return rows.map(r => this.fix(r))
  }

  async getStats() {
    const [artistCount, albumCount, trackCount, audioCount, artCount, playlistCount, libraryCount] =
      await Promise.all([
        this.db.select({ count: sql<number>`count(*)::int` }).from(artists).then(r => Number(r[0]?.count ?? 0)),
        this.db.select({ count: sql<number>`count(*)::int` }).from(albums).then(r => Number(r[0]?.count ?? 0)),
        this.db.select({ count: sql<number>`count(*)::int` }).from(tracks).then(r => Number(r[0]?.count ?? 0)),
        this.db.select({ count: sql<number>`count(*)::int` }).from(audioAssets).then(r => Number(r[0]?.count ?? 0)),
        this.db.select({ count: sql<number>`count(*)::int` }).from(artAssets).then(r => Number(r[0]?.count ?? 0)),
        this.db.select({ count: sql<number>`count(*)::int` }).from(playlists).then(r => Number(r[0]?.count ?? 0)),
        this.db.select({ count: sql<number>`count(*)::int` }).from(sources).then(r => Number(r[0]?.count ?? 0)),
      ])
    return {
      artists: artistCount,
      albums: albumCount,
      tracks: trackCount,
      artAssets: artCount,
      audioAssets: audioCount,
      playlists: playlistCount,
      libraries: libraryCount,
    }
  }

  async deleteTracksBySource(sourceId: string) {
    await this.db.delete(tracks).where(eq(tracks.sourceId, sourceId))
  }

  async getArtists() {
    return this.fixMany(await this.db.select().from(artists).orderBy(artists.name)) as any as Artist[]
  }

  async getArtist(id: string) {
    const [row] = await this.db.select().from(artists).where(eq(artists.id, id)).limit(1)
    return (row ? this.fix(row) : null) as any as Artist | null
  }

  async getArtistAlbums(artistId: string) {
    return this.fixMany(await this.db.select().from(albums).where(eq(albums.artistId, artistId))) as any as Album[]
  }

  async getAlbums() {
    return this.fixMany(await this.db.select().from(albums).orderBy(albums.name)) as any as Album[]
  }

  async getAlbum(id: string) {
    const [row] = await this.db.select().from(albums).where(eq(albums.id, id)).limit(1)
    return (row ? this.fix(row) : null) as any as Album | null
  }

  async getAlbumTracks(albumId: string) {
    return this.fixMany(await this.db.select().from(tracks).where(eq(tracks.albumId, albumId))) as any as Track[]
  }

  async getAllTracks() {
    return this.fixMany(await this.db.select().from(tracks)) as any as Track[]
  }

  async getTrack(id: string) {
    const [row] = await this.db.select().from(tracks).where(eq(tracks.id, id)).limit(1)
    return (row ? this.fix(row) : null) as any as Track | null
  }

  async getAudioAssetsByParent(parentId: string) {
    return this.fixMany(await this.db.select().from(audioAssets).where(eq(audioAssets.parentId, parentId))) as any as AudioAsset[]
  }

  async getAudioAssets() {
    return this.fixMany(await this.db.select().from(audioAssets)) as any as AudioAsset[]
  }

  async getAudioAsset(id: string) {
    const [row] = await this.db.select().from(audioAssets).where(eq(audioAssets.id, id)).limit(1)
    return (row ? this.fix(row) : null) as any as AudioAsset | null
  }

  async getPlaylist(id: string) {
    const [row] = await this.db.select().from(playlists).where(eq(playlists.id, id)).limit(1)
    return (row ? this.fix(row) : null) as any as Playlist | null
  }

  async getAllPlaylists() {
    return this.fixMany(await this.db.select().from(playlists)) as any as Playlist[]
  }

  async setPlaylists(entries: { id: string; name: string; imageUrl?: string | null }[]) {
    await this.db.delete(playlists)
    for (const p of entries) {
      const sid = stableId("playlist", p.name)
      await this.db
        .insert(playlists)
        .values({ stableId: sid, name: p.name, imageUrl: p.imageUrl ?? null })
        .onConflictDoNothing({ target: playlists.stableId })
    }
  }

  async getArt(entityId: string, entityType: "album" | "artist", role: "cover" | "portrait" = "cover") {
    const [row] = await this.db
      .select()
      .from(artAssets)
      .where(and(eq(artAssets.entityId, entityId), eq(artAssets.entityType, entityType), eq(artAssets.role, role)))
      .limit(1)
    return row ? this.fix(row) as any as ArtAsset : null
  }

  async getArtById(id: string) {
    const [row] = await this.db.select().from(artAssets).where(eq(artAssets.id, id)).limit(1)
    return row ? this.fix(row) as any as ArtAsset : null
  }

  async getArtBatch(entityIds: string[], entityType: "album" | "artist", role: "cover" | "portrait" = "cover") {
    if (entityIds.length === 0) return new Map()
    const rows = await this.db
      .select()
      .from(artAssets)
      .where(and(eq(artAssets.entityType, entityType), eq(artAssets.role, role), inArray(artAssets.entityId, entityIds)))
    const map = new Map<string, ArtAsset>()
    for (const row of rows) {
      map.set(row.entityId, this.fix(row) as any as ArtAsset)
    }
    return map
  }

  async getAllArt(entityId: string, entityType: "album" | "artist") {
    return this.db.select().from(artAssets).where(and(eq(artAssets.entityId, entityId), eq(artAssets.entityType, entityType))) as any as ArtAsset[]
  }

  async getAllSources() {
    return await this.db.select().from(sources).orderBy(sources.name)
  }

  async getSource(id: string) {
    const [row] = await this.db.select().from(sources).where(eq(sources.id, id)).limit(1)
    return row ?? null
  }

  async rebuildIndex() {
    const allArtists = await this.db.select().from(artists)
    const allAlbums = await this.db.select().from(albums)
    const allPlaylists = await this.db.select().from(playlists)

    fuse_artists.setCollection(allArtists as any)
    fuse_albums.setCollection(allAlbums as any)
    fuse_playlists.setCollection(allPlaylists as any)

    await this.onIndexRebuilt?.()
  }
}
