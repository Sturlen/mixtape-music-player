import { APITester } from "./APITester"
import { treaty } from "@elysiajs/eden"

import type { App } from "./index"
import { useQuery } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { useAudioPlayer } from "./Player"

// todo: fix localhost
const client = treaty<App>("localhost:3000")

async function getAlbum(albumId: string) {
  const { data, error } = await client.api.albums({ albumId }).get()
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
  const { setTrack, play } = useAudioPlayer()

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
          src={album.imageUrl}
          alt={album.name}
          width={"128rem"}
          height={"128rem"}
        />
      </summary>
      <div>
        {album.tracks.map((track) => (
          <div>
            <button
              onClick={() => {
                setTrack(track.id)
                play()
              }}
              style={{ backgroundColor: "black", color: "white" }}
            >
              <span>{track.name}</span>
            </button>
          </div>
        ))}
      </div>
    </details>
  )
}

export default Album
