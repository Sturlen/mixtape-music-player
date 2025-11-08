import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/client/lib/eden"
import { Link } from "@tanstack/react-router"
import { GridLayout } from "@/client/Components/ui/grid"
import { Input } from "@/client/Components/ui/input"
import Page from "@/client/Components/Page"
import { useDeferredValue, useState } from "react"
import { usePlayAlbum } from "@/client/lib/api"

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
  const deferredSearchTerm = useDeferredValue(searchInput)

  return (
    <Page>
      <div className="flex items-center gap-4 flex-col md:flex-row md:justify-between mb-8">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-6">
          Albums
        </h1>
        <Input
          placeholder="🔍 Search for whatever you need..."
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
          className="5bg-card text-card-foreground overflow-hidden w-full"
        >
          <div className="relative">
            <div className="group p-1 bg-gradient-to-br from-muted/10 to-transparent">
              <button
                type="button"
                onClick={() => playAlbum({ albumId: album.id })}
                className="group-hover:cursor-pointer w-full block relative transform-gpu transition-transform group-hover:scale-[1.01]"
              >
                <div className="w-full aspect-square relative border border-[rgba(0,0,0,0.06)] shadow-[0_8px_20px_rgba(2,6,23,0.12)] transform-gpu transition-transform duration-200 will-change-transform origin-center group-hover:[transform:scale(1.03)]">
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
                      className="w-full h-full object-contain rounded-none border-0 p-0 bg-muted"
                    />
                  </picture>
                </div>
              </button>
            </div>
          </div>

          <div className=" w-full">
            <Link
              to="/albums/$id"
              params={{ id: album.id }}
              className="block hover:underline w-full"
            >
              <h2 className="text-sm font-semibold truncate w-full px-1">
                {album.name}
              </h2>
            </Link>
            <p className="text-xs text-muted-foreground truncate px-1">
              Artist
            </p>
          </div>
        </li>
      ))}
    </GridLayout>
  )
}
