import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { getArtist, usePlayAlbum } from "@/lib/api"
import { Link } from "@tanstack/react-router"
import Page from "@/client/components/Page"
import { GridLayout } from "@/client/components/ui/grid"
import { ArtImage } from "@/client/components/ArtImage"
import type { Album } from "@/lib/types"

export const Route = createFileRoute("/artists/$id")({
  component: ArtistPage,
})

function useArtist(artistId: string) {
  return useQuery({
    queryKey: ["artists", artistId],
    queryFn: () => getArtist(artistId),
  })
}

function ArtistPage() {
  const { id } = Route.useParams()
  const { data } = useArtist(id)

  const playAlbum = usePlayAlbum()

  if (!data) {
    return <div></div>
  }

  const artist = data.artist

  if (!artist) {
    return <div>album not found</div>
  }

  return (
    <Page>
      <ArtImage
        src={
          artist.imageURL
            ? artist.imageURL + "?w=400&h=400&q=85&f=jpeg"
            : undefined
        }
        name={artist.name}
        primaryColor={artist.primaryColor}
        textColor={artist.textColor as string | undefined}
        className="size-40"
      />
      <h1 className="text-4xl font-extrabold md:text-6xl lg:text-8xl">
        {artist.name}
      </h1>
      <h2>Albums</h2>
      <GridLayout>
        {artist.albums.map((album) => (
          <li
            key={album.id}
            className="5bg-card text-card-foreground overflow-hidden shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative">
              <div className="group from-muted/10 bg-gradient-to-br to-transparent p-1">
                <button
                  type="button"
                  onClick={() => playAlbum({ albumId: album.id })}
                  className="relative block w-full transform-gpu transition-transform group-hover:scale-[1.01] group-hover:cursor-pointer"
                >
                  <div className="relative aspect-square w-full origin-center transform-gpu border border-[rgba(0,0,0,0.06)] shadow-[0_8px_20px_rgba(2,6,23,0.12)] transition-transform duration-200 will-change-transform group-hover:[transform:scale(1.03)]">
                    <ArtImage
                      src={
                        (album as any).imageURL
                          ? (album as any).imageURL + "?w=200&h=200&q=85&f=jpeg"
                          : undefined
                      }
                      name={album.name}
                      primaryColor={(album as any).primaryColor}
                      textColor={(album as any).textColor}
                      className="h-full w-full"
                    />
                  </div>
                </button>
              </div>
            </div>

            <div className="p-3">
              <h2 className="truncate text-sm font-semibold">
                <Link
                  to="/albums/$id"
                  params={{ id: album.id }}
                  className="block hover:underline"
                >
                  {album.name}
                </Link>
              </h2>
              <Link
                to="/artists/$id"
                params={{ id: artist.id }}
                className="block hover:underline"
              >
                <p className="text-muted-foreground truncate text-xs">
                  {artist.name}
                </p>
              </Link>
            </div>
          </li>
        ))}
      </GridLayout>
    </Page>
  )
}
