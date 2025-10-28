import Page from "@/Components/Page"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { EdenClient } from "@/lib/eden"
import { Link } from "@tanstack/react-router"
import { GridLayout } from "@/Components/ui/grid"

export const Route = createFileRoute("/")({
  component: Index,
})

async function getArtists() {
  const { data, error } = await EdenClient.api.artists.get()
  if (error) {
    throw new Error("error")
  }
  return data
}

function useArtists() {
  return useQuery({ queryKey: ["artists"], queryFn: getArtists })
}

function Index() {
  const { data: artists } = useArtists()

  return (
    <Page>
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
        <GridLayout>
          {artists?.map((artist) => (
            <li className="w-40">
              <Link to="/artists/$id" params={{ id: artist.id }}>
                <img
                  src={artist.imageURL}
                  className="size-40 bg-[url(cassette.webp)] bg-cover object-cover"
                />
                <h2>{artist.name}</h2>
              </Link>
            </li>
          ))}
        </GridLayout>
      </article>
    </Page>
  )
}
