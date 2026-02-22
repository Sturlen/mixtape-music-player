import type { Artist, Album, Track, Playlist } from "@/lib/types"

export interface DemoMusicData {
  artists: Artist[]
  albums: Album[]
  tracks: Track[]
  playlists: Playlist[]
}

export const EXPECTED_STATS = {
  artists: 1,
  albums: 1,
  tracks: 2,
  artAssets: 1,
  audioAssets: 2,
  playlists: 1,
}

export function findArtistByName(
  artists: Artist[],
  name: string,
): Artist | undefined {
  return artists.find((a) => a.name === name)
}

export function findArtistByNamePattern(
  artists: Artist[],
  pattern: RegExp,
): Artist | undefined {
  return artists.find((a) => pattern.test(a.name))
}

export function findAlbumByName(
  albums: Album[],
  name: string,
): Album | undefined {
  return albums.find((a) => a.name === name)
}

export function findAlbumByNamePattern(
  albums: Album[],
  pattern: RegExp,
): Album | undefined {
  return albums.find((a) => pattern.test(a.name))
}

export function findTrackByName(
  tracks: Track[],
  name: string,
): Track | undefined {
  return tracks.find((t) => t.name === name)
}

export function findTrackByNamePattern(
  tracks: Track[],
  pattern: RegExp,
): Track | undefined {
  return tracks.find((t) => pattern.test(t.name))
}

export function findPlaylistByName(
  playlists: Playlist[],
  name: string,
): Playlist | undefined {
  return playlists.find((p) => p.name === name)
}

export function isSortedAlphabetically<T>(
  items: T[],
  getKey: (item: T) => string,
): boolean {
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]
    const curr = items[i]
    if (prev && curr && getKey(prev).localeCompare(getKey(curr)) > 0) {
      return false
    }
  }
  return true
}

export function isSortedByTrackNumber(tracks: Track[]): boolean {
  for (let i = 1; i < tracks.length; i++) {
    const prevTrack = tracks[i - 1]
    const currTrack = tracks[i]
    if (!prevTrack || !currTrack) continue
    const prevNum = prevTrack.trackNumber
    const currNum = currTrack.trackNumber
    if (prevNum !== undefined && currNum !== undefined && prevNum > currNum) {
      return false
    }
  }
  return true
}
