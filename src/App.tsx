import { APITester } from "./APITester"
import { treaty } from "@elysiajs/eden"
import { PauseIcon, PlayIcon } from "lucide-react"
import "./index.css"

import type { App } from "./index"
import { useQuery } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { Album } from "./Album"
import { useAudioPlayer } from "./Player"

// todo: fix localhost
const client = treaty<App>("localhost:3000")

function raise(message: string) {
  throw new Error(message)
}

async function getArtists() {
  const { data, error } = await client.api.artists.get()
  if (error) {
    throw new Error("error")
  }
  return data
}

function useArtists() {
  return useQuery({ queryKey: ["albums"], queryFn: getArtists })
}

export function App() {
  const { data: artists } = useArtists()

  return (
    <div className="app">
      <article>
        <div>
          {artists?.map((artist) => (
            <div>
              <h2>{artist.name}</h2>
              <div>
                {artist.albums.map((album) => (
                  <Album albumId={album.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

export default App
