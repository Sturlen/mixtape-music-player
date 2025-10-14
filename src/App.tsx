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
      <article
        style={{
          backgroundColor: "black",
          borderRadius: "16px",
          overflow: "hidden",
          padding: "2rem",
        }}
      >
        <h1>Spelemann</h1>
        <Controls />
        <div>
          {artists?.map((artist) => (
            <div>
              <h2>{artist.name}</h2>
              <div style={{ backgroundColor: "grey" }}>
                {artist.albums.map((album) => (
                  <Album albumId={album.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: "8px",
          fontSize: "0.9rem",
          zIndex: 1000,
          textAlign: "left",
        }}
      >
        <div style={{ fontStyle: "italic" }}>Brudeferden i Hardanger</div>
        <div>Photo: Nasjonalmuseet / Børre Høstland</div>
      </div>
    </div>
  )
}

export default App

function Controls() {
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const isPlaying = useAudioPlayer.use.isPlaying()

  return (
    <div>
      {isPlaying ? (
        <button
          onClick={() => pause()}
          style={{ background: "black", border: "white" }}
        >
          <PauseIcon />
        </button>
      ) : (
        <button
          onClick={() => play()}
          style={{ background: "black", border: "white" }}
        >
          <PlayIcon />
        </button>
      )}

      <div>
        <CurrentTime />
        <Duration />
      </div>
    </div>
  )
}

function CurrentTime() {
  const time = useAudioPlayer.use.currentTime()
  if (!Number.isFinite(time)) {
    return <span>--:--</span>
  }

  return <span>{toMinutes(time)}</span>
}

function Duration() {
  const duration = useAudioPlayer.use.duration()
  if (!Number.isFinite(duration)) {
    return <span>--:--</span>
  }

  return <span style={{ color: "grey" }}>{toMinutes(duration)}</span>
}

function toMinutes(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toFixed(0)
    .padStart(2, "0")
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")
  return `${mins}:${secs}`
}
