import { createFileRoute, useParams } from "@tanstack/react-router"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import Page from "@/client/components/Page"
import { usePlayPlaylist } from "@/lib/api"
import { AddToPlaylistButton } from "@/client/components/AddToPlaylistButton"

export const Route = createFileRoute("/playlists/$id")({
  component: RouteComponent,
})

async function getPlaylist(playlistId: string) {
  const { data, error } = await EdenClient.api
    .playPlaylist({ playlistId })
    .post()
  if (error) {
    throw new Error("error")
  }
  return data
}

function usePlaylist(playlistId: string) {
  return useQuery({
    queryKey: ["playlists", playlistId],
    queryFn: () => getPlaylist(playlistId),
  })
}

function RouteComponent() {
  const { id } = Route.useParams()
  const { data } = usePlaylist(id)
  const play = useAudioPlayer((s) => s.play)
  const queuePush = useAudioPlayer.use.queuePush()
  const playPlaylist = usePlayPlaylist()
  const queryClient = useQueryClient()

  const removeTrackMutation = useMutation({
    mutationFn: async ({ trackId }: { trackId: string }) => {
      const { data, error } = await EdenClient.api
        .playlists({ playlistId: id })
        .tracks({ trackId })
        .delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists", id] })
    },
  })

  const deletePlaylistMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await EdenClient.api
        .playlists({ playlistId: id })
        .delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] })
      window.location.href = "/playlists"
    },
  })

  if (!data) {
    return <div></div>
  }

  const playlist = data.playlist

  if (!playlist) {
    return <div>mixtape not found</div>
  }

  return (
    <Page className="px-0">
      <div className="px-2">
        <img
          src={playlist.imageUrl}
          alt={playlist.name}
          className="size-40 bg-[url(cassette.webp)] bg-cover object-cover"
        />
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-4xl font-extrabold md:text-6xl lg:text-8xl">
            {playlist.name}
          </h1>
          <div className="flex flex-col items-end gap-2">
            {deletePlaylistMutation.error && (
              <div className="text-destructive text-right text-sm">
                {deletePlaylistMutation.error.message ===
                "Mixtape deletion is disabled"
                  ? "Mixtape deletion is disabled"
                  : "Failed to delete mixtape"}
              </div>
            )}
            <button
              onClick={() => {
                if (
                  confirm(`Are you sure you want to delete "${playlist.name}"?`)
                ) {
                  deletePlaylistMutation.mutate()
                }
              }}
              disabled={deletePlaylistMutation.isPending}
              className="hover:bg-destructive hover:text-destructive-foreground border-destructive/20 text-destructive rounded border px-4 py-2 transition-colors disabled:opacity-50"
            >
              {deletePlaylistMutation.isPending
                ? "Deleting..."
                : "Delete Mixtape"}
            </button>
          </div>
        </div>

        <div>
          <button
            className="hover:bg-accent bg-background mb-4 rounded-md border p-4"
            onClick={() => playPlaylist({ playlistId: playlist.id })}
          >
            Play Mixtape
          </button>
        </div>
        <h2 className="mt-8 mb-4 text-2xl font-bold">TRACKS</h2>
      </div>

      <ol className="bg-background flex w-full flex-col">
        {data.tracks.map(
          (
            track: {
              id: string
              name: string
              playtimeSeconds: number
              trackNumber?: number
            },
            i: number,
          ) => (
            <li
              key={track.id}
              className="hover:bg-accent/50 grid w-full grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-t p-2 pl-8 transition-colors last:border-b"
            >
              <button
                onClick={() => {
                  playPlaylist({ playlistId: playlist.id, trackIndex: i })
                }}
                className="truncate text-left text-sm font-medium hover:underline md:text-base"
              >
                <span className="text-muted-foreground inline-block w-10 font-mono">
                  {track.trackNumber?.toString().padStart(3, "0") || "--"}
                </span>
                <span>{track.name}</span>
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(`Remove "${track.name}" from "${playlist.name}"?`)
                  ) {
                    removeTrackMutation.mutate({ trackId: track.id })
                  }
                }}
                disabled={removeTrackMutation.isPending}
                className="hover:bg-destructive hover:text-destructive-foreground border-destructive/20 rounded border px-4 py-2 whitespace-nowrap transition-colors disabled:opacity-50"
              >
                {removeTrackMutation.isPending ? "Removing..." : "Remove"}
              </button>
              <AddToPlaylistButton
                trackId={track.id}
                trackName={track.name}
                className="hover:bg-accent rounded border border-current px-4 py-2 whitespace-nowrap transition-colors"
              />
              <button
                className="hover:bg-accent rounded border border-current px-4 py-2 whitespace-nowrap transition-colors"
                onClick={() => {
                  queuePush({
                    id: track.id,
                    name: track.name,
                    duration: track.playtimeSeconds,
                  })
                  play()
                }}
              >
                <span>Queue</span>
              </button>
            </li>
          ),
        )}
      </ol>
    </Page>
  )
}
