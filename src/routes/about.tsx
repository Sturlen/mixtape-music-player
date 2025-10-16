import Page from "@/Components/Page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/about")({
  component: About,
})

function About() {
  return (
    <Page>
      <div className="p-2">Hello from About!</div>
    </Page>
  )
}
