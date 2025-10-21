import Album from "@/Album"
import { createFileRoute, useParams } from "@tanstack/react-router"

export const Route = createFileRoute("/albums/$id")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  return <Album albumId={id} />
}
