import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import { Link } from "@tanstack/react-router"
import { GridLayout } from "@/client/components/ui/grid"
import Page from "@/client/components/Page"
import { Input } from "@/client/components/ui/input"
import { useState } from "react"
import { useDebouncer } from "@tanstack/react-pacer"

export const Route = createFileRoute("/artists/")({
  component: RouteComponent,
})

async function getArtists(query: string) {
  const { data, error } = await EdenClient.api.artists.get({
    query: { q: query },
  })
  if (error) {
    throw new Error("error")
  }
  return data
}

function useArtists(query: string) {
  return useQuery({
    queryKey: ["artists", "search", query],
    queryFn: () => getArtists(query),
  })
}

function RouteComponent() {
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const searchDebouncer = useDebouncer(
    (query: string) => setSearchQuery(query),
    { wait: 300 },
  )

  return (
    <Page>
      <div className="mb-8 flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <h1 className="mb-6 text-3xl font-extrabold md:text-5xl lg:text-6xl">
          Artists
        </h1>
        <Input
          placeholder="🔍 Search for Rick Astley..."
          className="rounded-none md:w-1/2"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            searchDebouncer.maybeExecute(e.target.value)
          }}
        />
      </div>
      <Content searchTerm={searchQuery} />
    </Page>
  )
}

function Content({ searchTerm }: { searchTerm: string }) {
  const { data, error } = useArtists(searchTerm)

  if (error) {
    return <div className="p-8">Error loading artists</div>
  }

  if (!data) {
    return <div className="p-8">Loading...</div>
  }

  const artists = data

  if (!artists || artists.length === 0) {
    return <div className="p-8">No artists found</div>
  }

  return (
    <GridLayout>
      {artists.map((artist) => (
        <li
          key={artist.id}
          className="5bg-card text-card-foreground overflow-hidden shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="relative">
            <div className="group from-muted/10 bg-gradient-to-br to-transparent p-1">
              <Link
                to={"/artists/$id"}
                params={{ id: artist.id }}
                className="relative block w-full transform-gpu transition-transform group-hover:scale-[1.01] group-hover:cursor-pointer"
              >
                <div className="relative aspect-square w-full origin-center transform-gpu border border-[rgba(0,0,0,0.06)] shadow-[0_8px_20px_rgba(2,6,23,0.12)] transition-transform duration-200 will-change-transform group-hover:[transform:scale(1.03)]">
                  <picture>
                    <source
                      srcSet={
                        artist.imageURL
                          ? `${artist.imageURL}?w=200&h=200&q=75&f=avif 1x, ${artist.imageURL}?w=400&h=400&q=75&f=avif 2x`
                          : "/cassette.webp"
                      }
                      type="image/avif"
                    />
                    <source
                      srcSet={
                        artist.imageURL
                          ? `${artist.imageURL}?w=150&h=150&q=80&f=webp 1x, ${artist.imageURL}?w=300&h=300&q=80&f=webp 2x`
                          : "/cassette.webp"
                      }
                      type="image/webp"
                    />
                    <img
                      loading="lazy"
                      src={
                        artist.imageURL
                          ? artist.imageURL + "?w=200&h=200&q=85&f=jpeg"
                          : "/cassette.webp"
                      }
                      alt={artist.name}
                      className="bg-muted h-full w-full rounded-none border-0 object-contain p-0"
                    />
                  </picture>
                </div>
              </Link>
            </div>
          </div>
          <Link
            to={"/artists/$id"}
            params={{ id: artist.id }}
            className="block p-4 hover:underline"
          >
            {artist.name}
          </Link>
        </li>
      ))}
    </GridLayout>
  )
}
