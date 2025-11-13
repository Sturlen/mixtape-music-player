import MobileControls from "@/client/components/mobile-controls"
import PlaybackDetails from "@/client/components/PlaybackDetails"
import ReloadButton from "@/client/components/ReloadButton"
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

const RootLayout = () => (
  <div className="to-background min-h-full bg-gradient-to-b from-amber-800 from-[20vh] to-[100vh]">
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
      </nav>
      <nav className="hidden w-full items-center justify-around md:flex [&>*]:p-4">
        <Link
          to="/artists"
          className="[&.active]:bg-secondary [&.active]:font-bold"
        >
          Artists
        </Link>
      </nav>
      <nav className="hidden w-full items-center justify-around md:flex [&>*]:p-4">
        <Link
          to="/about"
          className="[&.active]:bg-secondary [&.active]:font-bold"
        >
          About
        </Link>
      </nav>

      <div title="WIP">
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
      <section className="overflow-hidden">
        <h2 className="font-inter-400 pb-2 text-center text-2xl">QUEUE</h2>
        <PlaybackQueue className="h-full" />
      </section>
      <section className="">
        <h2 className="font-inter-400 pb-2 text-center text-2xl">
          PLAYBACK CONTROLS
        </h2>

        <div className="bg-accent w-full flex-col items-center justify-items-center self-end rounded-2xl p-4">
          <div className="flex items-center justify-items-center">
            <Controls />
          </div>
        </div>
      </section>
    </div>
  )
}
export const Route = createRootRoute({ component: RootLayout })
