import { useState, useEffect } from "react"
import { Users, Copy, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/client/components/ui/dialog"
import { Button } from "@/client/components/ui/button"
import { cn } from "@/lib/utils"
import { createRoomId } from "@/listen-together/room-id"
import { useListenTogetherStore } from "@/listen-together/store"

function getRoomParam(): string | null {
  return new URLSearchParams(window.location.search).get("room_id")
}

function setRoomParam(roomId: string | null) {
  const url = new URL(window.location.href)
  if (roomId) {
    url.searchParams.set("room_id", roomId)
  } else {
    url.searchParams.delete("room_id")
  }
  window.history.replaceState({}, "", url.toString())
}

function normalizeRoomInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    const extracted = parsed.searchParams.get("room_id")
    if (extracted) return extracted
  } catch {
    // not a URL, treat as raw room ID
  }
  return trimmed
}

function roomUrl(roomId: string): string {
  const url = new URL(window.location.origin)
  url.searchParams.set("room_id", roomId)
  return url.toString()
}

function useSearchRoomId() {
  const [roomId, setRoomIdState] = useState(getRoomParam)

  useEffect(() => {
    const onPopState = () => setRoomIdState(getRoomParam())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  return roomId
}

export function ListenTogetherDialog() {
  const roomId = useSearchRoomId()
  const storeRoomId = useListenTogetherStore((s) => s.roomId)
  const isHost = useListenTogetherStore((s) => s.isHost)
  const isEnded = useListenTogetherStore((s) => s.isEnded)
  const connected = useListenTogetherStore((s) => s.connected)

  const [joinId, setJoinId] = useState("")
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const inSession = !!storeRoomId

  const handleCreate = () => {
    const id = createRoomId()
    setRoomParam(id)
    useListenTogetherStore.getState().setRoomId(id)
    setOpen(false)
  }

  const handleJoin = () => {
    const normalized = normalizeRoomInput(joinId)
    if (normalized) {
      setRoomParam(normalized)
      useListenTogetherStore.getState().setRoomId(normalized)
      setOpen(false)
    }
  }

  const handleLeave = () => {
    setRoomParam(null)
    useListenTogetherStore.getState().clear()
    setOpen(false)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl(storeRoomId!))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative",
            inSession && connected && "text-green-500",
          )}
        >
          <Users size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Listen Together</DialogTitle>
        </DialogHeader>
        {inSession ? (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  connected ? "bg-green-500" : "bg-yellow-500",
                )}
              />
              {connected ? "Connected" : "Connecting..."}
              {isHost === true && " as host"}
              {isHost === false && " as listener"}
            </div>
            {isEnded && (
              <p className="text-sm text-muted-foreground">Session ended</p>
            )}
            <div className="bg-muted flex items-center justify-between gap-2 rounded px-3 py-2 text-xs">
              <span className="min-w-0 truncate font-mono">{roomUrl(storeRoomId!)}</span>
              <button onClick={handleCopyLink} className="shrink-0 p-1">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <Button onClick={handleLeave} variant="destructive">
              Leave Session
            </Button>
          </div>
        ) : (
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
                  placeholder="Room ID or invite link"
                  className="bg-muted flex-1 rounded px-3 py-2 text-sm"
                />
                <Button onClick={handleJoin} variant="secondary">
                  Join
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
