import { EdenClient } from "@/client/lib/eden"
import type { Album, Track } from "@/shared/types"
import { useAudioPlayer } from "@/Player"
import { useMutation } from "@tanstack/react-query"

export async function getArtist(artistId: string) {
  const { data, error } = await EdenClient.api.artists({ artistId }).get()
  if (error) {
    throw new Error("error")
  }
  return data
}

async function playAlbum(albumId: string) {
  const { data, error } = await EdenClient.api.playAlbum({ albumId }).post()
  if (error) {
    throw new Error("error")
  }
  return data as {
    album: Album
    tracks: Track[]
  }
}

export function usePlayAlbum() {
  const queueSet = useAudioPlayer.use.queueSet()
  const { mutate } = useMutation<
    {
      album: Album
      tracks: Track[] // TODO: improve type. rely on inferred types from EdenClient
    },
    Error,
    { albumId: string; trackIndex?: number }
  >({
    mutationFn: ({ albumId, trackIndex }) => playAlbum(albumId),
    onSuccess: ({ album, tracks }, { trackIndex = 0 }) => {
      queueSet(
        tracks.map((track) => ({
          id: track.id,
          name: track.name,
          duration: track.playtimeSeconds,
          artURL: album.imageURL,
        })),
        trackIndex
      )
    },
  })
  return mutate
}
