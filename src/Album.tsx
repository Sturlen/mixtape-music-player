import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "./Player"
import { EdenClient } from "./lib/eden"

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

export function Album({ albumId }: { albumId: string }) {
  const { data } = useAlbum(albumId)
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
    <div>
      <img
        src={album.imageURL}
        alt={album.name}
        className="size-40 bg-[url(cassette.webp)] bg-cover"
      />
      <h1 className="text-8xl font-extrabold mb-10">{album.name}</h1>

      <div>
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
      </div>
      <h2>TRACKS</h2>
      <div>
        {album.tracks.map((track) => (
          <div key={track.id} className="w-full">
            <button
              onClick={() => {
                playTrack({
                  name: track.name,
                  url: track.URL,
                  duration: track.playtimeSeconds,
                  artURL: track.artURL,
                })
                play()
              }}
              className="border-2 p-2 hover:bg-accent"
            >
              <span>{track.name}</span>
            </button>
            <button
              className="border-2 p-2 hover:bg-accent"
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
              <span>queue</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Album
