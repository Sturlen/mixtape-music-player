import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { PlayerProvider } from "@/client/components/PlayerProvider"
import { PlaybackDrawerProvider } from "@/contexts/PlaybackDrawerContext"
import { router } from "@/client/router"
import "@/index.css"

const queryClient = new QueryClient()
const elem = document.getElementById("root")!

createRoot(elem).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PlaybackDrawerProvider>
        <PlayerProvider>
          <RouterProvider router={router} />
        </PlayerProvider>
      </PlaybackDrawerProvider>
    </QueryClientProvider>
  </StrictMode>,
)
