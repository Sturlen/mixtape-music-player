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

  if (!data) {
    return <div></div>
  }

  const album = data.album

  if (!album) {
    return <div>album not found</div>
  }

  return (
    <details>
      <summary>
        {album.name}{" "}
        <img
          src={album.imageURL}
          alt={album.name}
          width={"128rem"}
          height={"128rem"}
        />
      </summary>
      <div>
        {album.tracks.map((track) => (
          <div key={track.id}>
            <button
              onClick={() => {
                playTrack({
                  name: track.name,
                  url: track.URL,
                  duration: track.playtimeSeconds,
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
                })
                play()
              }}
            >
              <span>queue</span>
            </button>
          </div>
        ))}
      </div>
    </details>
  )
}

export default Album
