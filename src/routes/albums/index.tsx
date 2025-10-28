import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import { Link } from "@tanstack/react-router"
import { GridLayout } from "@/Components/ui/grid"

export const Route = createFileRoute("/albums/")({
  component: RouteComponent,
})

async function getAlbums() {
  const { data, error } = await EdenClient.api.albums.get()
  if (error) {
    throw new Error("error")
  }
  return data
}

function useAlbums() {
  return useQuery({
    queryKey: ["albums"],
    queryFn: () => getAlbums(),
  })
}

function RouteComponent() {
  const { data } = useAlbums()
  const queueSet = useAudioPlayer.use.queueSet()

  if (!data) {
    return <div className="p-8">Loading...</div>
  }

  const albums = data.albums

  if (!albums || albums.length === 0) {
    return <div className="p-8">No albums found</div>
  }

  return (
    <div className="p-6 md:p-12 lg:p-20">
      <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-6">
        Albums
      </h1>

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
                    <img
                      src={album.imageURL}
                      alt={album.name}
                      className="w-full h-full object-contain rounded-none border-0 p-0 bg-muted"
                    />
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
    </div>
  )
}
