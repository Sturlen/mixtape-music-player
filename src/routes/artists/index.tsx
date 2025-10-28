import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import { Link } from "@tanstack/react-router"
import { GridLayout } from "@/Components/ui/grid"
import Page from "@/Components/Page"
import { Input } from "@/Components/ui/input"
import { useState, useDeferredValue } from "react"

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
  const deferredSearchTerm = useDeferredValue(searchInput)

  return (
    <Page>
      <div className="flex items-center gap-4 flex-col md:flex-row md:justify-between mb-8">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-6">
          Artists
        </h1>
        <Input
          placeholder="🔍 Search for Rick Astley..."
          className="md:w-1/2 rounded-none"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      <Content searchTerm={deferredSearchTerm} />
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
          className="5bg-card text-card-foreground overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="relative">
            <div className="group  p-1 bg-gradient-to-br from-muted/10 to-transparent">
              <Link
                to={"/artists/$id"}
                params={{ id: artist.id }}
                className="group-hover:cursor-pointer w-full block relative transform-gpu transition-transform group-hover:scale-[1.01]"
              >
                <div className="w-full aspect-square relative border border-[rgba(0,0,0,0.06)] shadow-[0_8px_20px_rgba(2,6,23,0.12)] transform-gpu transition-transform duration-200 will-change-transform origin-center group-hover:[transform:scale(1.03)]">
                  <img
                    loading="lazy"
                    src={artist.imageURL}
                    alt={artist.name}
                    className="w-full h-full object-contain rounded-none border-0 p-0 bg-muted"
                  />
                </div>
              </Link>
            </div>
          </div>
          <Link
            to={"/artists/$id"}
            params={{ id: artist.id }}
            className="p-4 block hover:underline"
          >
            {artist.name}
          </Link>
        </li>
      ))}
    </GridLayout>
  )
}
