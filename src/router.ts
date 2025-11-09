import { createRouter } from "@tanstack/react-router"
import { routeTree } from "@/routeTree.gen"

// Create and export the router instance
// This is a separate file to avoid circular dependencies
export let router = createRouter({ routeTree })

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Handle HMR for route tree updates
if (import.meta.hot) {
  import.meta.hot.accept("@/routeTree.gen", (module) => {
    if (module) {
      // Recreate the router with the updated route tree
      router = createRouter({ routeTree: module.routeTree })
    }
  })
}
