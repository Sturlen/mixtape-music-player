import type { App } from "./index"
import { useQuery } from "@tanstack/react-query"
import { Album } from "./Album"
import { EdenClient } from "./lib/eden"
import { Link } from "@tanstack/react-router"
import Artist from "./Artist"

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
    <div className="p-2 md:px-20 md:pt-40">
      <article>
        <div className="mb-20">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-extrabold">
            COLLECTION
          </h1>
          <span className="italic">
            LOOK UPON YOUR MIGHTY BACKLOG AND{" "}
            <span className="text-amber-400">✨DESPAIR✨</span>
          </span>
        </div>
        <ul className="flex flex-wrap gap-2">
          {artists?.map((artist) => (
            <li className="w-40">
              <Link to="/artists/$id" params={{ id: artist.id }}>
                <img
                  src={artist.imageURL}
                  className="size-40 bg-[url(cassette.webp)] bg-cover "
                />
                <h2>{artist.name}</h2>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}

export default App
