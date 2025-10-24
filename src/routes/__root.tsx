import { ScrollArea } from "@/Components/ui/scroll-area"
import Controls from "@/Controls"
import { cn } from "@/lib/utils"
import { MediaSessionSync } from "@/MediaSessionSync"
import PlaybackQueue from "@/QueueList"
import VolumeSlider from "@/VolumeControl"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { UserIcon } from "lucide-react"

const RootLayout = () => (
  <div className="h-full bg-gradient-to-b from-accent from-[200px] to-black to-[600px]">
    <header className="bg-black h-30 flex p-2 md:p-10 items-center justify-between fixed top-0 left-0 xl:left-[25rem] right-0">
      <Link to="/">
        <h1 className="text-2xl md:text-3xl italic font-serif font-battle whitespace-nowrap">
          MIXTAPE
        </h1>
      </Link>
      {/* <div className="grow"></div> */}
      <nav className="md:flex justify-around items-center [&>*]:p-4 w-full hidden">
        <Link
          to="/about"
          className="[&.active]:font-bold [&.active]:bg-secondary"
        >
          About
        </Link>
      </nav>

      <div title="WIP">
        <UserIcon />
      </div>
    </header>
    <Sidebar className="w-[25rem] hidden xl:flex" />
    <div className="pt-30 xl:pl-[25rem]">
      <div>
        <Outlet />
      </div>
    </div>

    <TanStackRouterDevtools position="top-right" />
    <MediaSessionSync />
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
          <VolumeSlider />
        </div>
      </div>
    </section>
  )
}
export const Route = createRootRoute({ component: RootLayout })
