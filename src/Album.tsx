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
  const play = useAudioPlayer((s) => s.play)
  const setTrack = useAudioPlayer((s) => s.setTrack)

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
          <div>
            <button
              onClick={() => {
                setTrack({
                  name: track.name,
                  url: track.URL,
                  duration: track.playtimeSeconds,
                })
                play()
              }}
              style={{
                backgroundColor: "black",
                color: "white",
                borderRadius: "2rem",
              }}
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
