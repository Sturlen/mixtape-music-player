import { ScrollArea } from "@/Components/ui/scroll-area"
import Controls from "@/Controls"
import { MediaSessionSync } from "@/MediaSessionSync"
import PlaybackQueue from "@/QueueList"
import VolumeSlider from "@/VolumeControl"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

const RootLayout = () => (
  <div className="h-full grid grid-rows-[8rem_1fr]">
    <header className="bg-black h-full flex flex-col">
      <div className="p-4 grow">
        <h1 className="text-3xl italic font-serif font-battle">MIXTAPE ZX25</h1>
      </div>
      <div className="flex">
        <Link
          to="/"
          className="[&.active]:font-bold [&.active]:bg-secondary p-4"
        >
          Home
        </Link>
        <Link
          to="/about"
          className="[&.active]:font-bold [&.active]:bg-secondary  p-4"
        >
          About
        </Link>
      </div>
    </header>
    <div className="grid md:grid-cols-[32rem_1fr] h-full overflow-hidden gap-4">
      <section className="md:flex flex-col p-10 border-4 hidden items-center">
        <h2 className="text-2xl text-center pb-2 font-inter-400">QUEUE</h2>
        <PlaybackQueue />
        <div className="grow"></div>
        <h2 className="text-2xl text-center pb-2 font-inter-400">
          PLAYBACK CONTROLS
        </h2>
        <div className="bg-accent rounded-2xl w-full p-4 flex-col items-center justify-items-center">
          <div className="flex justify-items-center items-center">
            <Controls />
            <VolumeSlider />
          </div>
        </div>
      </section>
      <ScrollArea className="overflow-y-auto bg-gradient-to-b from-accent from-20% to-black">
        <Outlet />
      </ScrollArea>
    </div>

    <TanStackRouterDevtools />
    <MediaSessionSync />
  </div>
)

export const Route = createRootRoute({ component: RootLayout })
