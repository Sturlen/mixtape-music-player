import Page from "@/client/components/Page"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { EdenClient } from "@/lib/eden"
import { Mic2, Disc3, Music } from "lucide-react"

export const Route = createFileRoute("/")({
  component: RouteComponent,
})

async function getStats() {
  const { data, error } = await EdenClient.api.stats.get()
  if (error) {
    throw new Error("error")
  }
  return data
}

function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: getStats })
}

function RouteComponent() {
  return (
    <Page>
      <article className="space-y-16">
        <div className="mb-20">
          <h1 className="text-5xl leading-tight font-black tracking-tighter md:text-7xl lg:text-9xl">
            YOUR COLLECTION
          </h1>
          <span className="block text-xl font-bold tracking-wide md:text-2xl lg:text-3xl">
            LOOK UPON YOUR MIGHTY BACKLOG AND{" "}
            <span className="animate-pulse text-amber-400">✨DESPAIR✨</span>
          </span>
        </div>
        <Content />
      </article>
    </Page>
  )
}

function Content() {
  const { data, error } = useStats()

  if (error) {
    return (
      <div className="p-12 text-center text-xl font-bold text-red-500">
        Error loading statistics
      </div>
    )
  }

  if (!data) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-3">
      <Link to="/artists">
        <StatCard
          number={data.artists}
          label="ARTISTS"
          icon={Mic2}
          className="bg-purple-500"
        />
      </Link>
      <Link to="/albums">
        <StatCard
          number={data.albums}
          label="ALBUMS"
          icon={Disc3}
          className="bg-blue-500"
        />
      </Link>
      <Link to="/playlists">
        <StatCard
          number={data.playlists ?? 0}
          label="MIXTAPES"
          icon={Music}
          className="bg-green-500"
        />
      </Link>
      <Link to="/">
        <StatCard
          number={data.tracks}
          label="TRACKS"
          icon={Music}
          className="bg-orange-500"
        />
      </Link>
    </div>
  )
}

function StatCard({
  number,
  label,
  icon: Icon,
  className,
}: {
  number: number
  label: string
  icon: React.ComponentType<{ className?: string }>
  className: string
}) {
  return (
    <div
      className={`${className} transform cursor-pointer rounded-lg p-8 shadow-xl transition-transform duration-300 hover:scale-105`}
    >
      <div className="mb-4">
        <Icon className="h-12 w-12 text-white" />
      </div>
      <div className="mb-2 text-6xl font-black text-white md:text-7xl">
        {number.toLocaleString()}
      </div>
      <div className="text-xl font-bold tracking-widest text-white md:text-2xl">
        {label}
      </div>
    </div>
  )
}
