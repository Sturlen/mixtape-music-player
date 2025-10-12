import { APITester } from "./APITester"
import { treaty } from "@elysiajs/eden"
import "./index.css"

import logo from "./logo.svg"
import reactLogo from "./react.svg"

import type { App } from "./index"
import { useQuery } from "@tanstack/react-query"
import { useRef, useState } from "react"

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

  const player = useRef<HTMLAudioElement>(null)

  function setTrack(id: string) {
    console.log(id)
    if (player.current) {
      player.current.src = `/api/playback/${id}`
      player.current?.play()
    }
  }

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
        <audio ref={player} controls />

        <h1>Spelemann</h1>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>

        <div>
          {artists?.map((a) => (
            <div>
              <h2>{a.name}</h2>
              <div style={{ backgroundColor: "grey" }}>
                {a.albums.map((al) => (
                  <details>
                    <summary>{al.name}</summary>
                    <div>
                      {al.tracks.map((tr) => (
                        <div>
                          <button
                            style={{ backgroundColor: "black", color: "white" }}
                            onClick={() => setTrack(tr.id)}
                          >
                            <span>{tr.name}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
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
