import { createFileRoute, Link } from "@tanstack/react-router"

import { useQuery } from "@tanstack/react-query"
import { EdenClient } from "@/lib/eden"
import { useCurrentTrack, useAudioPlayer } from "@/Player"
import { usePlayAlbum } from "@/lib/api"
import { PauseIcon, PlayIcon } from "lucide-react"
import { ArtImage } from "@/client/components/ArtImage"
import { EntityHeader } from "@/client/components/EntityHeader"
import { TrackRow } from "@/client/components/TrackRow"
import { formatTime } from "@/lib/utils"
import { useEffect } from "react"

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
  const playAlbum = usePlayAlbum()
  const pause = useAudioPlayer.use.pause()
  const currentTrack = useCurrentTrack()
  const requestedPlaybackState = useAudioPlayer.use.requestedPlaybackState()
  const currentTime = useAudioPlayer.use.currentTime()
  const currentlyPlayingTrackId = currentTrack?.id
  const isPlaying = requestedPlaybackState === "playing"
  const isThisAlbumPlaying = isPlaying && currentTrack?.album?.id === id

  useEffect(() => {
    if (!data?.album) return
    const hash = window.location.hash
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [data])

  if (!data) return <div></div>

  const album = data.album
  if (!album) return <div>album not found</div>

  const totalSeconds = album.tracks.reduce(
    (sum, t) => sum + t.playtimeSeconds,
    0,
  )

  return (
    <section>
      <div className="w-full">
        <div className="md:grid md:grid-cols-[1fr_2fr] md:gap-12">
          <div className="p-6 md:flex md:flex-col md:p-10">
            <EntityHeader
              image={
                <ArtImage
                  src={album.imageURL}
                  name={album.name}
                  primaryColor={album.primaryColor}
                  textColor={album.textColor}
                  className="size-full"
                />
              }
              title={album.name}
              primaryColor={album.primaryColor}
            >
              <Link
                to="/artists/$id"
                params={{ id: album.artistId }}
                className="mt-1 text-lg font-medium opacity-70 hover:opacity-100"
              >
                {album.artistName || "Unknown Artist"}
              </Link>
              <div className="mt-2 flex items-center gap-2 font-mono text-sm opacity-60">
                <span className="tracking-[0.2em] uppercase">Album</span>
                <span className="opacity-40">·</span>
                <span>{album.tracks.length} tracks</span>
                <span className="opacity-40">·</span>
                <span>{formatTime(totalSeconds)}</span>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() =>
                    isThisAlbumPlaying
                      ? pause()
                      : playAlbum({ albumId: album.id })
                  }
                  className="w-24 items-center gap-2 px-6 py-3 text-center text-sm font-bold tracking-widest uppercase transition hover:opacity-80"
                  style={{
                    backgroundColor: album.primaryColor ?? undefined,
                    color: album.textColor ?? undefined,
                  }}
                >
                  {isThisAlbumPlaying ? "Pause" : "Play"}
                </button>
              </div>
            </EntityHeader>
          </div>
          <ol className="px-6 pb-6 md:px-0 md:pb-0">
            {album.tracks.map((track, i) => (
              <TrackRow
                key={track.id}
                id={`track-${track.id}`}
                track={{
                  ...track,
                  primaryColor: album.primaryColor ?? undefined,
                  textColor: album.textColor ?? undefined,
                }}
                index={i}
                isActive={track.id === currentlyPlayingTrackId}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onPlay={() => playAlbum({ albumId: album.id, trackIndex: i })}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
