import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createRoomId } from "@/listen-together/room-id"
import { Button } from "@/client/components/ui/button"

export const Route = createFileRoute("/listen/")({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [joinId, setJoinId] = useState("")

  const handleCreate = () => {
    const roomId = createRoomId()
    navigate({ to: "/listen/$roomId", params: { roomId } })
  }

  const handleJoin = () => {
    const trimmed = joinId.trim()
    if (trimmed) {
      navigate({ to: "/listen/$roomId", params: { roomId: trimmed } })
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-3xl font-bold">Listen Together</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Create a listening session and share the link with friends.
        The first person to join becomes the host and controls playback.
      </p>

      <Button onClick={handleCreate} size="lg">
        Create Session
      </Button>

      <div className="flex w-full max-w-sm items-center gap-2">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-sm">or</span>
        <div className="bg-border h-px flex-1" />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <label className="text-sm font-medium">Join an existing session</label>
        <div className="flex gap-2">
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Enter room ID"
            className="bg-muted flex-1 rounded px-3 py-2 text-sm"
          />
          <Button onClick={handleJoin} variant="secondary">
            Join
          </Button>
        </div>
      </div>
    </div>
  )
}
