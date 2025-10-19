import Controls from "@/Controls"
import { MediaSessionSync } from "@/MediaSessionSync"
import PlaybackQueue from "@/QueueList"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

const RootLayout = () => (
  <>
    <header className="bg-black">
      <div className="p-4">
        <h1 className="text-3xl italic font-serif">Spelemann</h1>
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
    <hr />
    <Outlet />
    <Controls />
    <PlaybackQueue />
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        background: "rgba(0,0,0,0.7)",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: "8px",
        fontSize: "0.9rem",
        zIndex: 1000,
        textAlign: "left",
      }}
    >
      <div style={{ fontStyle: "italic" }}>Brudeferden i Hardanger</div>
      <div>Photo: Nasjonalmuseet / Børre Høstland</div>
    </div>
    <TanStackRouterDevtools />
    <MediaSessionSync />
  </>
)

export const Route = createRootRoute({ component: RootLayout })
