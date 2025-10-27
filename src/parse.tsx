import * as Bun from "bun"
import { readdir } from "fs/promises"
import path from "path"
import { type Source, type Artist, type Album, type Track } from "@/lib/types"

export async function parse(source: Source) {
  const db = {
    artists: new Array<Artist>(),
    albums: new Array<Album>(),
    tracks: new Array<Track>(),
  }

  const music_root_path = source.rootPath
  db.artists.length = 0
  db.albums.length = 0
  db.tracks.length = 0

  // read all the files in the current directory
  const artist_dirents = await readdir(music_root_path, {
    recursive: false,
    withFileTypes: true,
  })
  const artist_dirs = artist_dirents
    .filter((x) => x.isDirectory())
    .map((x) => x.name)

  for (const artist_dir of artist_dirs) {
    const artist_id = Bun.hash(artist_dir).toString(16)
    const artist: Artist = {
      id: artist_id,
      name: artist_dir,
      albums: [],
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
        console.log(artist.id, artist.name, artist.imageURL)
      }
    }

    // console.log(artist_dir, albums)
    db.artists.push(artist)

    for (const album_filename of albums) {
      const album_id = Bun.hash(album_filename).toString(16)
      const album: Album = {
        id: album_id,
        name: removeBandcampHeaders(album_filename),
        tracks: [],
      }

      db.albums.push(album)
      artist.albums.push(album)

      // console.log(album_name)
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
        const track_id = Bun.hash(filename).toString(16)
        const { trackNumber, title } = extractSongInfo(filename)
        const track: Track = {
          id: track_id,
          name: title,
          playtimeSeconds: 0,
          path: filepath,
          URL: `/api/files/track/${track_id}`,
        }

        if (file.type.startsWith("audio/")) {
          db.tracks.push(track)
          album.tracks.push(track)
        } else if (file.type.startsWith("image/")) {
          album.imagePath = filepath
          album.imageURL = `/api/files/albumart/${album_id}`
          track.artURL = album.imageURL
        }
      }

      // TODO: too many loops, too many loops
    }
  }
  return db
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
