import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { EdenClient } from "@/lib/eden"
import { Link } from "@tanstack/react-router"
import { GridLayout } from "@/client/components/ui/grid"
import { Input } from "@/client/components/ui/input"
import Page from "@/client/components/Page"
import { useState } from "react"
import { useDebouncer } from "@tanstack/react-pacer"
import { usePlayAlbum } from "@/lib/api"

export const Route = createFileRoute("/albums/")({
  component: RouteComponent,
})

async function getAlbums(query: string) {
  const { data, error } = await EdenClient.api.albums.get({
    query: { q: query },
  })
  if (error) {
    throw new Error("error")
  }
  return data
}

function useAlbums(query: string) {
  return useQuery({
    queryKey: ["albums", "search", query],
    queryFn: () => getAlbums(query),
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
          Albums
        </h1>
        <Input
          placeholder="🔍 Search for whatever you need..."
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
  const { data } = useAlbums(searchTerm)
  const playAlbum = usePlayAlbum()

  if (!data) {
    return <div className="p-8">Loading...</div>
  }

  const albums = data.albums

  if (!albums || albums.length === 0) {
    return <div className="p-8">No albums found</div>
  }
  return (
    <GridLayout>
      {albums.map((album) => (
        <li
          key={album.id}
          className="5bg-card text-card-foreground w-full overflow-hidden"
        >
          <div className="relative">
            <div className="group from-muted/10 bg-gradient-to-br to-transparent p-1">
              <button
                type="button"
                onClick={() => playAlbum({ albumId: album.id })}
                className="relative block w-full transform-gpu transition-transform group-hover:scale-[1.01] group-hover:cursor-pointer"
              >
                <div className="relative aspect-square w-full origin-center transform-gpu border border-[rgba(0,0,0,0.06)] shadow-[0_8px_20px_rgba(2,6,23,0.12)] transition-transform duration-200 will-change-transform group-hover:[transform:scale(1.03)]">
                  <picture>
                    <source
                      srcSet={
                        album.imageURL
                          ? `${album.imageURL}?w=200&h=200&q=75&f=avif 1x, ${album.imageURL}?w=400&h=400&q=75&f=avif 2x`
                          : "/cassette.webp"
                      }
                      type="image/avif"
                    />
                    <source
                      srcSet={
                        album.imageURL
                          ? `${album.imageURL}?w=150&h=150&q=80&f=webp 1x, ${album.imageURL}?w=300&h=300&q=80&f=webp 2x`
                          : "/cassette.webp"
                      }
                      type="image/webp"
                    />
                    <img
                      loading="lazy"
                      src={
                        album.imageURL
                          ? album.imageURL + "?w=200&h=200&q=85&f=jpeg"
                          : "/cassette.webp"
                      }
                      alt={album.name}
                      className="bg-muted h-full w-full rounded-none border-0 object-contain p-0"
                    />
                  </picture>
                </div>
              </button>
            </div>
          </div>

          <div className="w-full">
            <Link
              to="/albums/$id"
              params={{ id: album.id }}
              className="block w-full hover:underline"
            >
              <h2 className="w-full truncate px-1 text-sm font-semibold">
                {album.name}
              </h2>
            </Link>
            <p className="text-muted-foreground truncate px-1 text-xs">
              Artist
            </p>
          </div>
        </li>
      ))}
    </GridLayout>
  )
}
