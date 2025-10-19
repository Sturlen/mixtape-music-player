import Artist from "@/Artist"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/artists/$id")({
  component: ArtistPage,
})

function ArtistPage() {
  const { id } = Route.useParams()
  return (
    <div>
      <Artist id={id} />
    </div>
  )
}
