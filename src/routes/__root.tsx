import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import MobileControls from "@/client/components/mobile-controls"
import PlaybackDetails from "@/client/components/PlaybackDetails"
import ReloadButton from "@/client/components/ReloadButton"
import { SearchButton } from "@/client/components/SearchButton"
import { TitleSetter } from "@/client/components/TitleSetter"
import SeekBar from "@/client/components/SeekBar"
import Controls from "@/Controls"
import { cn } from "@/lib/utils"
import { MediaSessionSync } from "@/MediaSessionSync"
import PlaybackQueue from "@/QueueList"
import VolumeSlider from "@/VolumeControl"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { TextScroller } from "@/client/components/ui/TextScroller"
import { CurrentTrackScroller } from "@/client/components/CurrentTrackScroller"
import { ListenTogetherDialog } from "@/client/components/ListenTogetherDialog"
import { ListenTogetherProvider } from "@/listen-together/listen-together-provider"

function LibraryProgressWatcher() {
  const queryClient = useQueryClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const es = new EventSource("/api/library/progress")

    es.addEventListener("progress", () => {
      if (timerRef.current) return
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        queryClient.invalidateQueries()
      }, 5000)
    })

    es.addEventListener("done", () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      queryClient.invalidateQueries()
      es.close()
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      es.close()
    }
  }, [queryClient])

  return null
}

const RootLayout = () => (
  <div className="min-h-full bg-background">
    <LibraryProgressWatcher />
    <header className="fixed top-0 right-0 left-0 z-10 flex h-30 items-center justify-between bg-black p-2 md:p-10 xl:left-[25rem]">
      <Link to="/">
        <h1 className="font-battle font-serif text-2xl whitespace-nowrap italic md:text-3xl">
          MIXTAPE
        </h1>
      </Link>
      {/* <div className="grow"></div> */}
      <nav className="hidden w-full items-center justify-around md:flex [&>*]:p-4">
        <Link
          to="/albums"
          className="[&.active]:bg-secondary [&.active]:font-bold"
        >
          Albums
        </Link>
        <Link
          to="/artists"
          className="[&.active]:bg-secondary [&.active]:font-bold"
        >
          Artists
        </Link>
        <Link
          to="/playlists"
          className="[&.active]:bg-secondary [&.active]:font-bold"
        >
          Mixtapes
        </Link>
        <Link
          to="/libraries"
          className="[&.active]:bg-secondary [&.active]:font-bold"
        >
          Libraries
        </Link>
        <Link
          to="/about"
          className="[&.active]:bg-secondary [&.active]:font-bold"
        >
          About
        </Link>
        <Link
          to="/listen"
          className="[&.active]:bg-secondary [&.active]:font-bold"
        >
          Listen Together
        </Link>
      </nav>

      <div className="flex items-center gap-2">
        <SearchButton />
        <ReloadButton />
      </div>
    </header>
    <Sidebar className="hidden w-[25rem] xl:grid" />
    <div className="pt-30 pb-40 xl:pl-[25rem]">
      <Outlet />
    </div>

    <MobileControls className="xl:hidden" />

    <TanStackRouterDevtools position="top-right" />
    <MediaSessionSync />
    <PlaybackDetails />
    <TitleSetter />
    <ListenTogetherProvider />
  </div>
)

function Sidebar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-background fixed top-0 bottom-0 left-0 grid h-screen w-full grid-cols-1 grid-rows-[1fr_auto] gap-10 overflow-hidden border-4 p-10",
        className,
      )}
    >
      <section className="flex min-h-0 flex-col overflow-hidden">
        <h2 className="font-inter-400 shrink-0 pb-2 text-center text-2xl">QUEUE</h2>
        <PlaybackQueue className="min-h-0 flex-1" />
      </section>
      <section className="">
        <h2 className="font-inter-400 pb-2 text-center text-2xl">
          PLAYBACK CONTROLS
        </h2>

        <div className="bg-accent w-full flex-col items-center justify-items-center self-end rounded-2xl p-4">
          <div className="flex items-center justify-items-center">
            <Controls />
          </div>
          <div className="mt-4 flex justify-center">
            <ListenTogetherDialog />
          </div>
        </div>
      </section>
    </div>
  )
}
export const Route = createRootRoute({ component: RootLayout })
