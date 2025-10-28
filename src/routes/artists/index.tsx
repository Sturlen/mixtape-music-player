import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAudioPlayer } from "@/Player"
import { EdenClient } from "@/lib/eden"
import { Link } from "@tanstack/react-router"
import { GridLayout } from "@/Components/ui/grid"
import { ar } from "zod/v4/locales"

export const Route = createFileRoute("/artists/")({
  component: RouteComponent,
})

async function getArtists() {
  const { data, error } = await EdenClient.api.artists.get()
  if (error) {
    throw new Error("error")
  }
  return data
}

function useArtists() {
  return useQuery({
    queryKey: ["artists"],
    queryFn: () => getArtists(),
  })
}

function RouteComponent() {
  const { data } = useArtists()

  if (!data) {
    return <div className="p-8">Loading...</div>
  }

  const artists = data

  if (!artists || artists.length === 0) {
    return <div className="p-8">No artists found</div>
  }

  return (
    <div className="p-6 md:p-12 lg:p-20">
      <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-6">
        Artists
      </h1>

      <GridLayout>
        {artists.map((artist) => (
          <li
            key={artist.id}
            className="5bg-card text-card-foreground overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="relative">
              <div className="group  p-1 bg-gradient-to-br from-muted/10 to-transparent">
                <button
                  type="button"
                  className="group-hover:cursor-pointer w-full block relative transform-gpu transition-transform group-hover:scale-[1.01]"
                >
                  <div className="w-full aspect-square relative border border-[rgba(0,0,0,0.06)] shadow-[0_8px_20px_rgba(2,6,23,0.12)] transform-gpu transition-transform duration-200 will-change-transform origin-center group-hover:[transform:scale(1.03)]">
                    <img
                      src={artist.imageURL}
                      alt={artist.name}
                      className="w-full h-full object-contain rounded-none border-0 p-0 bg-muted"
                    />
                  </div>
                </button>
              </div>
            </div>
          </li>
        ))}
      </GridLayout>
    </div>
  )
}
