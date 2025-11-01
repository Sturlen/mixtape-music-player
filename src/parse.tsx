import * as Bun from "bun"
import { readdir } from "fs/promises"
import path from "path"
import {
  type Source,
  type Artist,
  type Album,
  type Track,
  type Asset,
  type AudioAsset,
  type ArtAsset,
} from "@/lib/types"

export async function parse(source: Source) {
  const db = {
    artists: new Map<string, Artist>(),
    albums: new Map<string, Album>(),
    tracks: new Map<string, Track>(),
    assets: new Map<string, Asset>(),
  }

  const music_root_path = source.rootPath

  // read all the files in the current directory
  const artist_dirents = await readdir(music_root_path, {
    recursive: false,
    withFileTypes: true,
  })
  const artist_dirs = artist_dirents
    .filter((x) => x.isDirectory())
    .map((x) => x.name)

  for (const artist_dir of artist_dirs) {
    const artist_id = generateHash("artist", artist_dir)
    const artist: Artist = {
      id: artist_id,
      name: artist_dir,
    }
    const albums = (
      await readdir(path.join(music_root_path, artist_dir), {
        withFileTypes: true,
      })
    )
      .filter((x) => x.isDirectory())
      .map((x) => x.name)

    const artist_dir_files = (
      await readdir(path.join(music_root_path, artist_dir), {
        withFileTypes: true,
      })
    )
      .filter((x) => x.isFile())
      .map((file) => file.name)

    for (const filename of artist_dir_files) {
      const file = Bun.file(path.join(music_root_path, artist_dir, filename))
      if (file.type.startsWith("image/")) {
        artist.imagePath = path.join(music_root_path, artist_dir, filename)
        artist.imageURL = `/api/files/artistart/${artist_id}`
      }
    }

    db.artists.set(artist.id, artist)

    for (const album_filename of albums) {
      const album_id = generateHash("album", album_filename)
      const album: Album = {
        id: album_id,
        name: removeBandcampHeaders(album_filename),
        artistId: artist_id,
      }

      db.albums.set(album.id, album)

      const tracks = (
        await readdir(path.join(music_root_path, artist_dir, album_filename), {
          withFileTypes: true,
          recursive: true,
        })
      )
        .filter((x) => !x.isDirectory())
        .map(({ name, parentPath }) => ({ filename: name, parentPath }))

      for (const { filename, parentPath } of tracks) {
        const filepath = path.join(parentPath, filename)

        const file = Bun.file(filepath)
        const filenameWithoutExt = filename.replace(/\.[^/.]+$/, "")
        const track_id = generateHash("track", filenameWithoutExt)
        const { trackNumber, title } = extractSongInfo(filename)
        const track: Track = {
          id: track_id,
          name: title,
          albumId: album_id,
          playtimeSeconds: 0,
          path: filepath,
          URL: `/api/files/track/${track_id}`,
        }

        // TODO: look into getting the actual file hash
        const asset_hash = generateHash("asset", filepath)

        if (file.type.startsWith("audio/")) {
          db.tracks.set(track.id, track)
          db.assets.set(asset_hash, {
            id: asset_hash,
            parentId: track_id,
            path: filepath,
            name: filename,
            filetype: "audio",
          } as AudioAsset)
          track.audiAssetId = asset_hash
          // TODO: get duration
        } else if (file.type.startsWith("image/")) {
          album.imagePath = filepath
          album.imageURL = `/api/files/albumart/${album_id}`
          track.artURL = album.imageURL
          album.artAssetId = asset_hash

          db.assets.set(asset_hash, {
            id: asset_hash,
            parentId: album_id,
            path: filepath,
            name: filename,
            filetype: "image",
          } as ArtAsset)
          // TODO: get dimensions
        }
      }

      // TODO: too many loops, too many loops
    }
  }
  return db
}

function generateHash(type: string, value: string): string {
  return type + Bun.hash(`${type}_${value}`).toString(16)
}

export function removeBandcampHeaders(str: string) {
  return str.split(" - ").at(-1) ?? str
}

/** For Bandcamp-style track names */
export function extractSongInfo(filename: string): {
  artist: string | null
  album: string | null
  trackNumber: string | null
  title: string
} {
  // Remove file extension
  const baseName = filename.replace(/\.[^.]+$/, "")

  // Pattern: "Artist - Album - 01 Title" or "Artist - Album - Title"
  const match = baseName.match(/^(.+?)\s-\s(.+?)\s-\s(?:(\d+)\s)?(.+)$/)

  if (!match || !match[1] || !match[2] || !match[4]) {
    return {
      artist: null,
      album: null,
      trackNumber: null,
      title: baseName,
    }
  }

  return {
    artist: match[1].trim(),
    album: match[2].trim(),
    trackNumber: match[3] ?? null,
    title: match[4].trim(),
  }
}
