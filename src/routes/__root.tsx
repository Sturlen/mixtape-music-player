import MobileControls from "@/Components/mobile-controls"
import PlaybackDetails from "@/Components/PlaybackDetails"
import ReloadButton from "@/Components/ReloadButton"
import { TitleSetter } from "@/Components/TitleSetter"
import SeekBar from "@/Components/SeekBar"
import Controls from "@/Controls"
import { cn } from "@/lib/utils"
import { MediaSessionSync } from "@/MediaSessionSync"
import PlaybackQueue from "@/QueueList"
import VolumeSlider from "@/VolumeControl"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

const RootLayout = () => (
  <div className="h-full bg-gradient-to-b from-amber-800 from-[20vh] to-black to-[100vh]">
    <header className="bg-black h-30 z-10 flex p-2 md:p-10 items-center justify-between fixed top-0 left-0 xl:left-[25rem] right-0">
      <Link to="/">
        <h1 className="text-2xl md:text-3xl italic font-serif font-battle whitespace-nowrap">
          MIXTAPE
        </h1>
      </Link>
      {/* <div className="grow"></div> */}
      <nav className="md:flex justify-around items-center [&>*]:p-4 w-full hidden">
        <Link
          to="/albums"
          className="[&.active]:font-bold [&.active]:bg-secondary"
        >
          Albums
        </Link>
      </nav>
      <nav className="md:flex justify-around items-center [&>*]:p-4 w-full hidden">
        <Link
          to="/artists"
          className="[&.active]:font-bold [&.active]:bg-secondary"
        >
          Artists
        </Link>
      </nav>
      <nav className="md:flex justify-around items-center [&>*]:p-4 w-full hidden">
        <Link
          to="/about"
          className="[&.active]:font-bold [&.active]:bg-secondary"
        >
          About
        </Link>
      </nav>

      <div title="WIP">
        <ReloadButton />
      </div>
    </header>
    <Sidebar className="w-[25rem] hidden xl:flex" />
    <div className="pt-30 xl:pl-[25rem] pb-40">
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
    <section
      className={cn(
        "fixed top-0 bottom-0 left-0 flex flex-col p-10 border-4 items-center bg-background",
        className
      )}
    >
      <h2 className="text-2xl text-center pb-2 font-inter-400">QUEUE</h2>
      <PlaybackQueue />
      <div className="grow"></div>
      <h2 className="text-2xl text-center pb-2 font-inter-400">
        PLAYBACK CONTROLS
      </h2>
      <div className="self-end bg-accent rounded-2xl w-full p-4 flex-col items-center justify-items-center">
        <div className="flex justify-items-center items-center">
          <Controls />
        </div>
        <div>SEEK</div>
        <SeekBar />
        <div>VOLUME CONTROLS</div>
        <VolumeSlider className="w-full grow" direction="horizontal" />
      </div>
    </section>
  )
}
export const Route = createRootRoute({ component: RootLayout })
