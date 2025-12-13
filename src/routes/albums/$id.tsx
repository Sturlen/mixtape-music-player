import { createFileRoute, useParams } from "@tanstack/react-router"

import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import Page from "@/client/components/Page"
import { usePlayAlbum } from "@/lib/api"
import { AddToPlaylistButton } from "@/client/components/AddToPlaylistButton"

export const Route = createFileRoute("/albums/$id")({
  component: RouteComponent,
})

async function getAlbum(albumId: string) {
  const { data, error } = await EdenClient.api.albums({ albumId }).get()
  if (error) {
    throw new Error("error")
  }
  return data
}

function useAlbum(albumId: string) {
  return useQuery({
    queryKey: ["albums", albumId],
    queryFn: () => getAlbum(albumId),
  })
}

function RouteComponent() {
  const { id } = Route.useParams()
  const { data } = useAlbum(id)
  const play = useAudioPlayer((s) => s.play)
  const queuePush = useAudioPlayer.use.queuePush()
  const playAlbum = usePlayAlbum()

  if (!data) {
    return <div></div>
  }

  const album = data.album

  if (!album) {
    return <div>album not found</div>
  }

  return (
    <Page className="px-0">
      <div className="px-2">
        <img
          src={album.imageURL}
          alt={album.name}
          className="size-40 bg-[url(cassette.webp)] bg-cover object-cover"
        />
        <h1 className="text-4xl font-extrabold md:text-6xl lg:text-8xl">
          {album.name}
        </h1>

        <div>
          <button
            className="hover:bg-accent bg-background mb-4 rounded-md border p-4"
            onClick={() => playAlbum({ albumId: album.id })}
          >
            Play Album
          </button>
        </div>
        <h2 className="mt-8 mb-4 text-2xl font-bold">TRACKS</h2>
      </div>

      <ol className="bg-background flex w-full flex-col">
        {album.tracks.map((track, i) => (
          <li
            key={track.id}
            className="hover:bg-accent/50 grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-t p-2 pl-8 transition-colors last:border-b"
          >
            <button
              onClick={() => {
                playAlbum({ albumId: album.id, trackIndex: i })
              }}
              className="truncate text-left text-sm font-medium hover:underline md:text-base"
            >
              <span className="text-muted-foreground inline-block w-10 font-mono">
                {track.trackNumber?.toString().padStart(3, "0") || "--"}
              </span>
              <span>{track.name}</span>

              {track.assets.length > 1 ? (
                <span
                  className="text-muted-foreground px-2 text-sm"
                  title={`Several files available`}
                >
                  {" "}
                  ({track.assets.length} assets)
                </span>
              ) : null}
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
                  artURL: track.artURL,
                })
                play()
              }}
            >
              <span>Queue</span>
            </button>
          </li>
        ))}
      </ol>
    </Page>
  )
}
