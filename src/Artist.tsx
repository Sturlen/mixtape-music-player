import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "./Player"
import { EdenClient } from "./lib/eden"
import { Link } from "@tanstack/react-router"

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

export function Artist({ id: artistId }: { id: string }) {
  const { data } = useArtist(artistId)
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
    <div className="p-20 pt-30">
      <img
        src={artist.imageURL}
        alt={artist.name}
        className="size-40 bg-[url(cassette.webp)] bg-cover"
      />
      <h1 className="text-8xl font-extrabold mb-10">{artist.name}</h1>
      <h2>Albums</h2>
      <ol className="flex flex-wrap gap-2">
        {artist.albums.map((album) => (
          <li key={album.id} className="w-40">
            <Link to="/albums/$id" params={{ id: album.id }}>
              <img
                src={album.imageURL}
                className="size-40 bg-[url(cassette.webp)] bg-cover"
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
    </div>
  )
}

export default Artist
