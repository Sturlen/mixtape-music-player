import type { Track } from "@/Player"
import type { Track as ApiTrack, Album } from "@/lib/types"

let trackCache: Map<string, Track> | null = null
let fetchPromise: Promise<void> | null = null

function toPlayerTrack(t: ApiTrack, album?: Album): Track {
  return {
    id: t.id,
    name: t.name,
    duration: t.playtimeSeconds,
    trackNumber: t.trackNumber,
    artURL: album?.imageURL ?? t.artURL,
    primaryColor: album?.primaryColor,
    textColor: album?.textColor,
    supportingColor: album?.supportingColor,
    album: album ? { id: album.id, name: album.name } : undefined,
  }
}

async function fetchData(): Promise<[ApiTrack[], Album[]]> {
  const [tracksRes, albumsRes] = await Promise.all([
    fetch("/api/tracks"),
    fetch("/api/albums"),
  ])
  const apiTracks: ApiTrack[] = tracksRes.ok ? await tracksRes.json() : []
  const albumsBody = albumsRes.ok ? await albumsRes.json() : { albums: [] }
  const albums: Album[] = albumsBody.albums ?? []
  return [apiTracks, albums]
}

function buildCache(
  apiTracks: ApiTrack[],
  albums: Album[],
): Map<string, Track> {
  const albumMap = new Map(albums.map((a) => [a.id, a]))
  return new Map(
    apiTracks.map((t) => [t.id, toPlayerTrack(t, albumMap.get(t.albumId))]),
  )
}

async function ensureCache(): Promise<Map<string, Track>> {
  if (trackCache) return trackCache
  if (fetchPromise) {
    await fetchPromise
    return trackCache!
  }
  fetchPromise = (async () => {
    try {
      const [apiTracks, albums] = await fetchData()
      trackCache = buildCache(apiTracks, albums)
    } catch {
      trackCache = new Map()
    }
  })()
  await fetchPromise
  return trackCache!
}

export async function resolveTrack(trackId: string): Promise<Track> {
  const cache = await ensureCache()
  const track = cache.get(trackId)
  if (track) return track
  const [apiTracks, albums] = await fetchData()
  trackCache = buildCache(apiTracks, albums)
  const found = trackCache.get(trackId)
  if (!found) throw new Error(`Track ${trackId} not found`)
  return found
}

export async function resolveTracks(trackIds: string[]): Promise<Track[]> {
  const cache = await ensureCache()
  const missing = trackIds.filter((id) => !cache.has(id))
  if (missing.length > 0) {
    const [apiTracks, albums] = await fetchData()
    trackCache = buildCache(apiTracks, albums)
  }
  return trackIds.map((id) => trackCache!.get(id)!).filter(Boolean)
}
