import { Elysia, t, NotFoundError, type DocumentDecoration } from "elysia"
import Fuse from "fuse.js"
import { env } from "@/shared/env"
import type { Playlist, Track } from "@/lib/types"
import {
  savePlaylist,
  deletePlaylist,
  generatePlaylistId,
} from "./server/playlist_parser"

interface PlaylistContext {
  db: {
    tracks: Map<string, Track>
    playlists: Map<string, Playlist>
  }
  fuse_playlists: Fuse<Playlist> // Fuse.js instance
}

export function createPlaylistRoutes(context: PlaylistContext) {
  const { db, fuse_playlists } = context

  return new Elysia({ prefix: "/api/playlists" })
    .get(
      "/",
      async ({ query: { q } }) => {
        let playlists: Playlist[]
        if (q) {
          playlists = fuse_playlists.search(q).map((res) => res.item)
        } else {
          playlists = Array.from(db.playlists.values())
        }
        return {
          playlists: playlists
            .map((playlist) => ({
              ...playlist,
              imagePath: undefined,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }
      },
      {
        detail: "Get playlists",
        query: t.Object({ q: t.Optional(t.String()) }),
      },
    )
    .get("/:playlistId", async ({ params: { playlistId } }) => {
      const playlist = db.playlists.get(playlistId)

      if (!playlist) {
        throw new NotFoundError("Playlist not found")
      }

      return {
        playlist: {
          ...playlist,
          imagePath: undefined,
          imageUrl: `/api/albumArt/${playlistId}`, // Reuse album art endpoint for playlist art
        },
      }
    })
    .post(
      "/",
      async ({ body }) => {
        if (!env.MIXTAPES_ENABLED) {
          throw new Error("Mixtape creation is disabled")
        }

        const playlist: Playlist = {
          id: generatePlaylistId(),
          name: body.name,
          tracks: [],
        }

        await savePlaylist(playlist, "./data/playlists")
        db.playlists.set(playlist.id, playlist)
        fuse_playlists.setCollection(Array.from(db.playlists.values()))

        return playlist
      },
      {
        body: t.Object({
          name: t.String(),
        }),
        detail: "Create a new playlist",
      },
    )
    .put(
      "/:playlistId",
      async ({ params: { playlistId }, body }) => {
        if (!env.MIXTAPES_ENABLED) {
          throw new Error("Mixtape modification is disabled")
        }

        const playlist = db.playlists.get(playlistId)
        if (!playlist) {
          throw new NotFoundError("Playlist not found")
        }

        const updatedPlaylist: Playlist = {
          ...playlist,
          name: body.name || playlist.name,
          tracks: body.tracks || playlist.tracks,
        }

        await savePlaylist(updatedPlaylist, "./data/playlists")
        db.playlists.set(playlistId, updatedPlaylist)
        fuse_playlists.setCollection(Array.from(db.playlists.values()))

        return updatedPlaylist
      },
      {
        body: t.Object({
          name: t.Optional(t.String()),
          tracks: t.Optional(
            t.Array(t.Object({ id: t.String(), name: t.String() })),
          ),
        }),
        detail: "Update a playlist",
      },
    )
    .delete("/:playlistId", async ({ params: { playlistId } }) => {
      if (!env.MIXTAPES_ENABLED) {
        throw new Error("Mixtape deletion is disabled")
      }

      const deletedPlaylist = await deletePlaylist(
        playlistId,
        "./data/playlists",
      )
      db.playlists.delete(playlistId)
      fuse_playlists.setCollection(Array.from(db.playlists.values()))

      return deletedPlaylist
    })
    .post(
      "/:playlistId/tracks",
      async ({ params: { playlistId }, body }) => {
        if (!env.MIXTAPES_ENABLED) {
          throw new Error("Mixtape modification is disabled")
        }

        const playlist = db.playlists.get(playlistId)
        if (!playlist) {
          throw new NotFoundError("Playlist not found")
        }

        const track = db.tracks.get(body.trackId)
        if (!track) {
          throw new NotFoundError("Track not found")
        }

        const trackExists = playlist.tracks.some((t) => t.id === body.trackId)
        if (trackExists) {
          throw new Error("Track already exists in playlist")
        }

        const updatedPlaylist: Playlist = {
          ...playlist,
          tracks: [...playlist.tracks, { id: track.id, name: track.name }],
        }

        await savePlaylist(updatedPlaylist, "./data/playlists")
        db.playlists.set(playlistId, updatedPlaylist)
        fuse_playlists.setCollection(Array.from(db.playlists.values()))

        return updatedPlaylist
      },
      {
        body: t.Object({
          trackId: t.String(),
        }),
        detail: "Add a track to a playlist",
      },
    )
    .delete(
      "/:playlistId/tracks/:trackId",
      async ({ params: { playlistId, trackId } }) => {
        if (!env.MIXTAPES_ENABLED) {
          throw new Error("Mixtape modification is disabled")
        }

        const playlist = db.playlists.get(playlistId)
        if (!playlist) {
          throw new NotFoundError("Playlist not found")
        }

        const updatedPlaylist: Playlist = {
          ...playlist,
          tracks: playlist.tracks.filter((t) => t.id !== trackId),
        }

        await savePlaylist(updatedPlaylist, "./data/playlists")
        db.playlists.set(playlistId, updatedPlaylist)
        fuse_playlists.setCollection(Array.from(db.playlists.values()))

        return updatedPlaylist
      },
    )
}
