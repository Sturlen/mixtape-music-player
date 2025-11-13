import Page from "@/client/components/Page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/about")({
  component: About,
})

function About() {
  return (
    <Page>
      <div style={{ fontStyle: "italic" }}>Brudeferden i Hardanger</div>
      <div>Photo: Nasjonalmuseet / Børre Høstland</div>
      Cassette Photo by <hr />
      <a href="https://unsplash.com/@etiennegirardet?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">
        Etienne Girardet
      </a>{" "}
      on{" "}
      <a href="https://unsplash.com/photos/a-black-and-white-tape-recorder-on-a-white-background-WWVnwP4D-N0?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">
        Unsplash
      </a>
    </Page>
  )
}
