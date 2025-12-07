import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { EdenClient } from "@/lib/eden"
import { Link } from "@tanstack/react-router"
import { GridLayout } from "@/client/components/ui/grid"
import Page from "@/client/components/Page"
import { Input } from "@/client/components/ui/input"
import { useState, useDeferredValue } from "react"

export const Route = createFileRoute("/playlists/")({
  component: RouteComponent,
})

async function getPlaylists(query: string) {
  const { data, error } = await EdenClient.api.playlists.get({
    query: { q: query },
  })
  if (error) {
    throw new Error("error")
  }
  return data
}

function usePlaylists(query: string) {
  return useQuery({
    queryKey: ["playlists", "search", query],
    queryFn: () => getPlaylists(query),
  })
}

function RouteComponent() {
  const [searchInput, setSearchInput] = useState("")
  const deferredSearchTerm = useDeferredValue(searchInput)

  return (
    <Page>
      <div className="mb-8 flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <h1 className="mb-6 text-3xl font-extrabold md:text-5xl lg:text-6xl">
          Playlists
        </h1>
        <Input
          placeholder="🔍 Search playlists..."
          className="rounded-none md:w-1/2"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      <Content searchTerm={deferredSearchTerm} />
    </Page>
  )
}

function Content({ searchTerm }: { searchTerm: string }) {
  const { data, error } = usePlaylists(searchTerm)

  if (error) {
    return <div className="p-8">Error loading playlists</div>
  }
  if (!data) {
    return <div className="p-8">Loading...</div>
  }

  const playlists = data.playlists

  if (!playlists || playlists.length === 0) {
    return <div className="p-8">No playlists found</div>
  }
  return (
    <GridLayout>
      {playlists.map((playlist) => (
        <li
          key={playlist.id}
          className="5bg-card text-card-foreground w-full overflow-hidden"
        >
          <div className="w-full">
            <Link
              to="/playlists/$id"
              params={{ id: playlist.id }}
              className="block w-full hover:underline"
            >
              <h2 className="w-full truncate px-1 text-sm font-semibold">
                {playlist.name}
              </h2>
            </Link>
            <p className="text-muted-foreground truncate px-1 text-xs">
              {playlist.tracks.length} tracks
            </p>
          </div>
        </li>
      ))}
    </GridLayout>
  )
}
