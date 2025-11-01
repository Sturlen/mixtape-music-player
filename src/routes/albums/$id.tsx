import { createFileRoute, useParams } from "@tanstack/react-router"

import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import Page from "@/Components/Page"

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
  const playTrack = useAudioPlayer.use.playTrack()
  const queuePush = useAudioPlayer.use.queuePush()
  const queueSet = useAudioPlayer.use.queueSet()

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
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-extrabold">
          {album.name}
        </h1>

        <div>
          <button
            className="hover:bg-accent p-4 border bg-background rounded-md mb-4"
            onClick={() =>
              queueSet(
                album.tracks.map((track) => ({
                  name: track.name,
                  url: track.URL,
                  duration: track.playtimeSeconds,
                  artURL: album.imageURL,
                }))
              )
            }
          >
            Play Album
          </button>
        </div>
        <h2 className="text-2xl font-bold mt-8 mb-4">TRACKS</h2>
      </div>

      <ol className="w-full flex flex-col bg-background">
        {album.tracks.map((track, i) => (
          <li
            key={track.id}
            className="w-full grid grid-cols-[1fr_auto_auto] gap-2 items-center p-2 pl-8 border-t hover:bg-accent/50 transition-colors last:border-b"
          >
            <button
              onClick={() => {
                queueSet(
                  album.tracks.map((track) => ({
                    name: track.name,
                    url: track.URL,
                    duration: track.playtimeSeconds,
                    artURL: album.imageURL,
                  })),
                  i
                )
              }}
              className="text-left font-medium text-sm md:text-base hover:underline truncate"
            >
              <span className="font-mono text-muted-foreground w-10 inline-block">
                {track.trackNumber?.toString().padStart(3, "0") || "--"}
              </span>
              <span>{track.name}</span>

              {track.assets.length > 1 ? (
                <span
                  className="text-sm text-muted-foreground px-2"
                  title={`Several files available`}
                >
                  {" "}
                  ({track.assets.length} assets)
                </span>
              ) : null}
            </button>
            <button
              className="px-4 py-2 border border-current rounded hover:bg-accent transition-colors whitespace-nowrap"
              onClick={() => {
                queuePush({
                  name: track.name,
                  url: track.URL,
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
