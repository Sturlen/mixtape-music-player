import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/client/components/ui/dialog"
import { Button } from "@/client/components/ui/button"
import { createRoomId } from "@/listen-together/room-id"

export function ListenTogetherDialog() {
  const navigate = useNavigate()
  const [joinId, setJoinId] = useState("")
  const [open, setOpen] = useState(false)

  const handleCreate = () => {
    const roomId = createRoomId()
    setOpen(false)
    navigate({ to: "/listen/$roomId", params: { roomId } })
  }

  const handleJoin = () => {
    const trimmed = joinId.trim()
    if (trimmed) {
      setOpen(false)
      navigate({ to: "/listen/$roomId", params: { roomId: trimmed } })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users size={16} />
          Listen Together
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Listen Together</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button onClick={handleCreate}>Create Session</Button>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-2">
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
      </DialogContent>
    </Dialog>
  )
}
