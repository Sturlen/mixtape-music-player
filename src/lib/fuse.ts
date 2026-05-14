import Fuse from "fuse.js"
import type { Artist, Album, Playlist, Track } from "@/lib/types"

export const fuse_artists = new Fuse<Artist>([], {
  keys: ["name"],
})

export const fuse_albums = new Fuse<Album>([], {
  keys: ["name"],
})

export const fuse_playlists = new Fuse<Playlist>([], {
  keys: ["name"],
})

export const fuse_tracks = new Fuse<Track>([], {
  keys: ["name"],
})
