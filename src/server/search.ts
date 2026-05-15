import Fuse from "fuse.js"
import type { Library } from "@/server/library"

type SearchDocument = {
  _type: "artist" | "album" | "track"
  id: string
  name: string
  artistName: string
  albumName: string
  year: string
}

type SearchResultItem = {
  type: "artist" | "album" | "track"
  id: string
  name: string
  artistId?: string
  albumId?: string
  artistName: string | null
  albumName: string | null
  year: number | null
  primaryColor: string | null
  textColor: string | null
  imageURL: string
  related: boolean
}

export class SearchService {
  private fuse: Fuse<SearchDocument> = new Fuse([], {
    keys: [
      { name: "name", weight: 2 },
      { name: "artistName", weight: 1.5 },
      { name: "albumName", weight: 1 },
      { name: "year", weight: 0.5 },
    ],
    threshold: 0.4,
    ignoreFieldNorm: false,
    fieldNormWeight: 1,
  })

  constructor(private library: Library) {}

  async buildIndex() {
    const [artists, albums, tracks] = await Promise.all([
      this.library.getArtists(),
      this.library.getAlbums(),
      this.library.getAllTracks(),
    ])

    const artistMap = new Map(artists.map((a) => [a.id, a.name]))

    const albumMap = new Map(albums.map((a) => [a.id, a]))

    const docs: SearchDocument[] = [
      ...artists.map((a) => ({
        _type: "artist" as const,
        id: a.id,
        name: a.name,
        artistName: "",
        albumName: "",
        year: "",
      })),
      ...albums.map((a) => ({
        _type: "album" as const,
        id: a.id,
        name: a.name,
        artistName: artistMap.get(a.artistId) ?? "",
        albumName: "",
        year: a.year ? String(a.year) : "",
      })),
      ...tracks.map((t) => {
        const album = albumMap.get(t.albumId)
        return {
          _type: "track" as const,
          id: t.id,
          name: t.name,
          artistName: album ? (artistMap.get(album.artistId) ?? "") : "",
          albumName: album?.name ?? "",
          year: "",
        }
      }),
    ]

    this.fuse.setCollection(docs)
  }

  async search(q: string) {
    if (!q || q.length < 1) return { results: [], related: [] }

    const raw = this.fuse.search(q, { limit: 15 })

    const results: SearchResultItem[] = []
    const related: SearchResultItem[] = []
    const seenIds = new Set<string>()

    for (const { item } of raw) {
      const key = `${item._type}:${item.id}`
      if (seenIds.has(key)) continue
      seenIds.add(key)

      const enrichment = await this.enrich(item)
      results.push({ ...enrichment, related: false })

      if (results.length >= 10) break
    }

    // Related: albums of top matched artist
    const topArtist = raw.find((r) => r.item._type === "artist")
    if (topArtist) {
      const albums = await this.library.getArtistAlbums(topArtist.item.id)
      for (const album of albums) {
        const key = `album:${album.id}`
        if (seenIds.has(key)) continue
        seenIds.add(key)
        const enriched = await this.enrichItem("album", album.id, album.name)
        if (enriched) related.push({ ...enriched, related: true })
      }
    }

    // Related: tracks of top matched album
    const topAlbum = raw.find((r) => r.item._type === "album")
    if (topAlbum) {
      const tracks = await this.library.getAlbumTracks(topAlbum.item.id)
      for (const track of tracks) {
        const key = `track:${track.id}`
        if (seenIds.has(key)) continue
        seenIds.add(key)
        const enriched = await this.enrichItem("track", track.id, track.name)
        if (enriched) related.push({ ...enriched, related: true })
      }
    }

    return { results, related }
  }

  private async enrich(item: SearchDocument): Promise<Omit<SearchResultItem, "related">> {
    return (await this.enrichItem(item._type, item.id, item.name))!
  }

  private async enrichItem(
    type: "artist" | "album" | "track",
    id: string,
    name: string,
  ): Promise<Omit<SearchResultItem, "related"> | null> {
    if (type === "artist") {
      const art = await this.library.getArt(id, "artist", "portrait")
      return {
        type,
        id,
        name,
        artistName: null,
        albumName: null,
        year: null,
        primaryColor: art?.primaryColor ?? null,
        textColor: art?.textColor ?? null,
        imageURL: `/api/files/artistart/${id}`,
      }
    }

    if (type === "album") {
      const album = await this.library.getAlbum(id)
      if (!album) return null
      const artist = album.artistId ? await this.library.getArtist(album.artistId) : null
      const art = await this.library.getArt(id, "album", "cover")
      return {
        type,
        id,
        name,
        artistId: album.artistId,
        artistName: artist?.name ?? null,
        albumName: null,
        year: album.year ?? null,
        primaryColor: art?.primaryColor ?? null,
        textColor: art?.textColor ?? null,
        imageURL: `/api/files/albumart/${id}`,
      }
    }

    // track
    const track = await this.library.getTrack(id)
    if (!track) return null
    const album = await this.library.getAlbum(track.albumId)
    const artist = album?.artistId ? await this.library.getArtist(album.artistId) : null
    const art = album ? await this.library.getArt(album.id, "album", "cover") : null
    return {
      type,
      id,
      name,
      albumId: track.albumId,
      artistName: artist?.name ?? null,
      albumName: album?.name ?? null,
      year: album?.year ?? null,
      primaryColor: art?.primaryColor ?? null,
      textColor: art?.textColor ?? null,
      imageURL: `/api/files/albumart/${track.albumId}`,
    }
  }
}
