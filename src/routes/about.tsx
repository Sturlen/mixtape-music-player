import Page from "@/Components/Page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/about")({
  component: About,
})

function About() {
  return (
    <Page>
      <div style={{ fontStyle: "italic" }}>Brudeferden i Hardanger</div>
      <div>Photo: Nasjonalmuseet / Børre Høstland</div>
    </Page>
  )
}
