import { createFileRoute, useParams } from "@tanstack/react-router"

import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import Page from "@/client/components/Page"
import { usePlayPlaylist } from "@/lib/api"

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

  if (!data) {
    return <div></div>
  }

  const playlist = data.playlist

  if (!playlist) {
    return <div>playlist not found</div>
  }

  return (
    <Page className="px-0">
      <div className="px-2">
        <img
          src={playlist.imageUrl}
          alt={playlist.name}
          className="size-40 bg-[url(cassette.webp)] bg-cover object-cover"
        />
        <h1 className="text-4xl font-extrabold md:text-6xl lg:text-8xl">
          {playlist.name}
        </h1>

        <div>
          <button
            className="hover:bg-accent bg-background mb-4 rounded-md border p-4"
            onClick={() => playPlaylist({ playlistId: playlist.id })}
          >
            Play Playlist
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
              className="hover:bg-accent/50 grid w-full grid-cols-[1fr_auto_auto] items-center gap-2 border-t p-2 pl-8 transition-colors last:border-b"
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
