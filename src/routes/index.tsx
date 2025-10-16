import { App } from "@/App"
import Page from "@/Components/Page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Index,
})

function Index() {
  return (
    <Page>
      <App />
    </Page>
  )
}
