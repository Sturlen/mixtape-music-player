import type { App } from "./index"
import { useQuery } from "@tanstack/react-query"
import { Album } from "./Album"
import { EdenClient } from "./lib/eden"

async function getArtists() {
  const { data, error } = await EdenClient.api.artists.get()
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
