import type { LimitFunction } from "p-limit"
import path from "path"
import type { Artist, Album, Track, ArtAsset, AudioAsset, Playlist } from "@/lib/types"
import type { AudioMetadata } from "@/server/audio"
import { createMetadataProvider } from "@/server/audio"
import { fuse_artists, fuse_albums, fuse_playlists } from "@/lib/fuse"
import type { ScanResult } from "./scanner"

function hash(type: string, value: string): string {
  return type + Bun.hash(`${type}_${value}`).toString(16)
}

function trackNameFromFile(filepath: string): string {
  const base = path.basename(filepath).replace(/\.[^/.]+$/, "")
  const numbered = base.match(/^(?:\d+\s)?(.+)$/)
  return numbered ? numbered[1]!.trim() : base
}

export class Library {
  artists = new Map<string, Artist>()
  albums = new Map<string, Album>()
  tracks = new Map<string, Track>()
  artAssets = new Map<string, ArtAsset>()
  audioAssets = new Map<string, AudioAsset>()
  playlists = new Map<string, Playlist>()

  clear() {
    this.artists.clear()
    this.albums.clear()
    this.tracks.clear()
    this.artAssets.clear()
    this.audioAssets.clear()
    this.playlists.clear()
  }

  private upsertArtist(name: string): Artist {
    const id = hash("artist", name)
    let artist = this.artists.get(id)
    if (!artist) {
      artist = { id, name }
      this.artists.set(id, artist)
    }
    return artist
  }

  private upsertAlbum(name: string, artistId: string, imagePath?: string): Album {
    const id = hash("album", `${name}_${artistId}`)
    let album = this.albums.get(id)
    if (!album) {
      album = { id, name, artistId }
      this.albums.set(id, album)
    }
    if (imagePath && !album.imagePath) {
      album.imagePath = imagePath
      album.imageURL = `/api/files/albumart/${id}`
    }
    return album
  }

  addFromMetadata(
    filePath: string,
    info: AudioMetadata,
    artByDir: Map<string, string>,
    sourceRoot: string,
  ): void {
    const dir = path.dirname(filePath)
    const relDir = path.relative(sourceRoot, dir)
    const parts = relDir.split(path.sep)

    const dirArtist = parts.length > 0 ? parts[0] : undefined
    const artistFromList = info.artistName?.split(",")[0]?.trim()
    const artistName = info.albumArtistName || dirArtist || artistFromList || "Unknown Artist"
    const albumName = info.albumName || (parts.length > 1 ? parts[1] : undefined) || "Unknown Album"
    const title = info.trackName || trackNameFromFile(filePath)
    const duration = info.durationSeconds.toJSON()

    const artist = this.upsertArtist(artistName)
    if (!artist.imagePath && parts.length > 0) {
      const artistArt = artByDir.get(path.join(sourceRoot, parts[0]!))
      if (artistArt) {
        artist.imagePath = artistArt
        artist.imageURL = `/api/files/artistart/${artist.id}`
      }
    }

    const albumArt = artByDir.get(dir)
    const album = this.upsertAlbum(albumName, artist.id, albumArt)

    const trackId = hash("track", `${artistName}/${albumName}/${title}`)
    if (this.tracks.has(trackId)) return

    const track: Track = {
      id: trackId,
      name: title,
      albumId: album.id,
      trackNumber: info.trackNumber,
      playtimeSeconds: duration,
      path: filePath,
    }
    this.tracks.set(trackId, track)

    const ext = path.extname(filePath).toLowerCase()
    const assetId = hash("asset", filePath)
    this.audioAssets.set(assetId, {
      id: assetId,
      parentId: trackId,
      path: filePath,
      name: path.basename(filePath),
      filetype: "audio",
      fileExt: ext,
      duration,
    })

    if (albumArt && album.imagePath) {
      const artExt = path.extname(albumArt).toLowerCase()
      const artAssetId = hash("asset", albumArt)
      if (!this.artAssets.has(artAssetId)) {
        this.artAssets.set(artAssetId, {
          id: artAssetId,
          parentId: album.id,
          path: albumArt,
          name: path.basename(albumArt),
          filetype: "image",
          fileExt: artExt,
          width: 0,
          height: 0,
        })
      }
    }
  }

  enrich(limit: LimitFunction, sources: { scan: ScanResult; rootPath: string }[]) {
    const provider = createMetadataProvider()

    const allFiles: { path: string; rootPath: string }[] = []
    const artByDir = new Map<string, string>()

    for (const { scan, rootPath } of sources) {
      for (const f of scan.audioFiles) allFiles.push({ path: f.path, rootPath })
      for (const [dir, img] of scan.artByDir) {
        if (!artByDir.has(dir)) artByDir.set(dir, img)
      }
    }

    const jobs = allFiles.map(({ path, rootPath }) =>
      limit(async () => {
        try {
          const info = await provider.getMetadata(path)
          this.addFromMetadata(path, info, artByDir, rootPath)
        } catch {
          // skip unparseable files
        }
      }),
    )

    Promise.allSettled(jobs).then(() => {
      this.rebuildIndex()
      console.log(
        "Metadata complete: %d tracks, %d artists, %d albums (from %d files)",
        this.tracks.size,
        this.artists.size,
        this.albums.size,
        allFiles.length,
      )
    })
  }

  rebuildIndex() {
    fuse_artists.setCollection(Array.from(this.artists.values()))
    fuse_albums.setCollection(Array.from(this.albums.values()))
    fuse_playlists.setCollection(Array.from(this.playlists.values()))
  }
}
