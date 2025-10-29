import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import { Link } from "@tanstack/react-router"
import Page from "@/Components/Page"
import { GridLayout } from "@/Components/ui/grid"

export const Route = createFileRoute("/artists/$id")({
  component: ArtistPage,
})

async function getArtist(artistId: string) {
  const { data, error } = await EdenClient.api.artists({ artistId }).get()
  if (error) {
    throw new Error("error")
  }
  return data
}

function useArtist(artistId: string) {
  return useQuery({
    queryKey: ["artists", artistId],
    queryFn: () => getArtist(artistId),
  })
}

function ArtistPage() {
  const { id } = Route.useParams()
  const { data } = useArtist(id)
  const play = useAudioPlayer((s) => s.play)
  const playTrack = useAudioPlayer.use.playTrack()
  const queuePush = useAudioPlayer.use.queuePush()
  const queueSet = useAudioPlayer.use.queueSet()

  if (!data) {
    return <div></div>
  }

  const artist = data.artist

  if (!artist) {
    return <div>album not found</div>
  }

  return (
    <Page>
      <picture>
        <source
          srcSet={
            artist.imageURL
              ? `${artist.imageURL}?w=300&h=300&q=75&f=avif 1x, ${artist.imageURL}?w=600&h=600&q=75&f=avif 2x`
              : "/cassette.webp"
          }
          type="image/avif"
        />
        <source
          srcSet={
            artist.imageURL
              ? `${artist.imageURL}?w=300&h=300&q=80&f=webp 1x, ${artist.imageURL}?w=600&h=600&q=80&f=webp 2x`
              : "/cassette.webp"
          }
          type="image/webp"
        />
        <img
          src={
            artist.imageURL
              ? artist.imageURL + "?w=400&h=400&q=85&f=jpeg"
              : "/cassette.webp"
          }
          alt={artist.name}
          className="size-40 bg-[url(cassette.webp)] bg-cover object-cover"
        />
      </picture>
      <h1 className="text-4xl md:text-6xl lg:text-8xl font-extrabold">
        {artist.name}
      </h1>
      <h2>Albums</h2>
      <GridLayout>
        {artist.albums.map((album) => (
          <li
            key={album.id}
            className="5bg-card text-card-foreground overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="relative">
              <div className="group  p-1 bg-gradient-to-br from-muted/10 to-transparent">
                <button
                  type="button"
                  onClick={() =>
                    queueSet(
                      album.tracks.map((track) => ({
                        name: track.name,
                        url: track.URL,
                        duration: track.playtimeSeconds,
                        artURL: album.imageURL,
                      }))
                    )
                  }
                  className="group-hover:cursor-pointer w-full block relative transform-gpu transition-transform group-hover:scale-[1.01]"
                >
                  <div className="w-full aspect-square relative border border-[rgba(0,0,0,0.06)] shadow-[0_8px_20px_rgba(2,6,23,0.12)] transform-gpu transition-transform duration-200 will-change-transform origin-center group-hover:[transform:scale(1.03)]">
                    <picture>
                      <source
                        srcSet={
                          album.imageURL
                            ? `${album.imageURL}?w=300&h=300&q=75&f=avif 1x, ${album.imageURL}?w=300&h=300&q=75&f=avif 2x`
                            : "/cassette.webp"
                        }
                        type="image/avif"
                      />
                      <source
                        srcSet={
                          album.imageURL
                            ? `${album.imageURL}?w=300&h=300&q=80&f=webp 1x, ${album.imageURL}?w=300&h=300&q=80&f=webp 2x`
                            : "/cassette.webp"
                        }
                        type="image/webp"
                      />
                      <img
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

            <div className="p-3">
              <h2 className="text-sm font-semibold truncate">
                <Link
                  to="/albums/$id"
                  params={{ id: album.id }}
                  className="block hover:underline"
                >
                  {album.name}
                </Link>
              </h2>
              <p className="text-xs text-muted-foreground truncate">Artist</p>
            </div>
          </li>
        ))}
      </GridLayout>
    </Page>
  )
}
