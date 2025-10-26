import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import { Link } from "@tanstack/react-router"
import Page from "@/Components/Page"

export const Route = createFileRoute("/artists/$id")({
  component: ArtistPage,
})

async function getArtist(artistId: string) {
  const { data, error } = await EdenClient.api.artists({ artistId }).get()
  if (error) {
    throw new Error("error")
  }
  return data
}

function useArtist(artistId: string) {
  return useQuery({
    queryKey: ["artists", artistId],
    queryFn: () => getArtist(artistId),
  })
}

function ArtistPage() {
  const { id } = Route.useParams()
  const { data } = useArtist(id)
  const play = useAudioPlayer((s) => s.play)
  const playTrack = useAudioPlayer.use.playTrack()
  const queuePush = useAudioPlayer.use.queuePush()
  const queueSet = useAudioPlayer.use.queueSet()

  if (!data) {
    return <div></div>
  }

  const artist = data.artist

  if (!artist) {
    return <div>album not found</div>
  }

  return (
    <Page>
      <img
        src={artist.imageURL}
        alt={artist.name}
        className="size-40 bg-[url(cassette.webp)] bg-cover object-cover"
      />
      <h1 className="text-4xl md:text-6xl lg:text-8xl font-extrabold">
        {artist.name}
      </h1>
      <h2>Albums</h2>
      <ol className="flex flex-wrap gap-2">
        {artist.albums.map((album) => (
          <li key={album.id} className="w-40">
            <Link to="/albums/$id" params={{ id: album.id }}>
              <img
                src={album.imageURL}
                className="size-40 bg-[url(cassette.webp)] bg-cover object-cover"
              />
              <h2>{album.name}</h2>
            </Link>
            <button
              className="hover:bg-accent p-4 border"
              onClick={() =>
                queueSet(
                  album.tracks.map((track) => ({
                    name: track.name,
                    url: track.URL,
                    duration: track.playtimeSeconds,
                    artURL: track.artURL,
                  }))
                )
              }
            >
              Play Album
            </button>
          </li>
        ))}
      </ol>
    </Page>
  )
}
