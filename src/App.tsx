import { APITester } from "./APITester"
import { treaty } from "@elysiajs/eden"
import "./index.css"

import type { App } from "./index"
import { useQuery } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { Album } from "./Album"

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
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>

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
