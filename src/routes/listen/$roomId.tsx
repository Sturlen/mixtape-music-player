import { createFileRoute, Link } from "@tanstack/react-router"
import { useListenTogether } from "@/listen-together/use-listen-together"
import { useListenTogetherStore } from "@/listen-together/store"
import { useCurrentTrack, useIsPlaying } from "@/Player"
import { Button } from "@/client/components/ui/button"

export const Route = createFileRoute("/listen/$roomId")({
  component: RouteComponent,
})

function RouteComponent() {
  const { roomId } = Route.useParams()
  const { connected, isHost, isEnded } = useListenTogether(roomId)
  const currentTrack = useCurrentTrack()
  const isPlaying = useIsPlaying()

  const status = isEnded ? "Session ended" : isHost ? "You are the host" : "Joined as listener"

  const handleLeave = () => {
    useListenTogetherStore.getState().clear()
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Listen Together</h1>
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span>{connected ? "Connected" : "Disconnected"}</span>
      </div>
      <div className="text-lg font-medium">{status}</div>
      <div className="text-muted-foreground text-sm">
        Room: <code className="rounded bg-gray-800 px-2 py-1">{roomId}</code>
      </div>

      <div className="bg-accent w-full max-w-md rounded-lg p-4 text-center">
        <div className="text-xl font-semibold">
          {currentTrack?.name ?? "No track selected"}
        </div>
        <div className="text-muted-foreground mt-1 text-sm">
          {isPlaying ? "Playing" : "Paused"}
        </div>
      </div>

      {isEnded && (
        <div className="text-center text-yellow-400">
          The host has left. This session is over.
        </div>
      )}

      <div className="flex gap-4">
        <Link to="/" onClick={handleLeave}>
          <Button variant="outline">Leave Session</Button>
        </Link>
      </div>

      <div className="mt-4 text-center">
        <p className="text-muted-foreground mb-2 text-sm">
          Share this room link with friends:
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={window.location.href}
            className="bg-muted rounded px-3 py-2 text-sm"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigator.clipboard.writeText(window.location.href)}
          >
            Copy
          </Button>
        </div>
      </div>
    </div>
  )
}
