/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { PlayerProvider } from "@/Components/PlayerProvider"
import { PlaybackDrawerProvider } from "@/contexts/PlaybackDrawerContext"
import { router } from "@/router"

const queryClient = new QueryClient()

const elem = document.getElementById("root")!

function renderApp() {
  const app = (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <PlaybackDrawerProvider>
          <PlayerProvider>
            <RouterProvider router={router} />
          </PlayerProvider>
        </PlaybackDrawerProvider>
      </QueryClientProvider>
    </StrictMode>
  )

  if (import.meta.hot) {
    // With hot module reloading, `import.meta.hot.data` is persisted.
    const root = (import.meta.hot.data.root ??= createRoot(elem))
    root.render(app)
  } else {
    // The hot module reloading API is not available in production.
    createRoot(elem).render(app)
  }
}

renderApp()

if (import.meta.hot) {
  // Accept updates from router module to trigger re-render
  import.meta.hot.accept("@/router", () => {
    renderApp()
  })
}
