import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { EdenClient } from "@/lib/eden"
import type { Playlist } from "@/lib/types"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/client/components/ui/drawer"
import { Input } from "@/client/components/ui/input"
import { cn } from "@/lib/utils"

interface PlaylistSelectorProps {
  trackId: string
  trackName: string
  children: React.ReactNode
  onOpenChange?: (open: boolean) => void
}

export function PlaylistSelector({
  trackId,
  trackName,
  children,
  onOpenChange,
}: PlaylistSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [newPlaylistName, setNewPlaylistName] = React.useState("")
  const [showCreateForm, setShowCreateForm] = React.useState(false)

  const queryClient = useQueryClient()

  const { data: playlistsData, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const { data } = await EdenClient.api.playlists.get()
      return data
    },
  })

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId }: { playlistId: string }) => {
      const { data, error } = await EdenClient.api
        .playlists({ playlistId })
        .tracks.post({
          trackId,
        })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] })
      setOpen(false)
    },
  })

  const createPlaylistMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await EdenClient.api.playlists.post({ name })
      if (error) throw error
      return data
    },
    onSuccess: (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] })
      addToPlaylistMutation.mutate({ playlistId: newPlaylist.id })
      setNewPlaylistName("")
      setShowCreateForm(false)
    },
  })

  const playlists = playlistsData?.playlists || []

  const handleAddToPlaylist = (playlistId: string) => {
    addToPlaylistMutation.mutate({ playlistId })
  }

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPlaylistName.trim()) {
      createPlaylistMutation.mutate(newPlaylistName.trim())
    }
  }

  React.useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Add "{trackName}" to Mixtape</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 p-4">
          {isLoading ? (
            <div className="text-muted-foreground text-center">
              Loading mixtapes...
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-muted-foreground text-center">
              No mixtapes found
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handleAddToPlaylist(playlist.id)}
                  disabled={addToPlaylistMutation.isPending}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <div className="font-medium">{playlist.name}</div>
                  <div className="text-muted-foreground text-sm">
                    {playlist.tracks.length} tracks
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            {showCreateForm ? (
              <form onSubmit={handleCreatePlaylist} className="flex gap-2">
                <Input
                  placeholder="New mixtape name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={
                    createPlaylistMutation.isPending || !newPlaylistName.trim()
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewPlaylistName("")
                  }}
                  className="border-border hover:bg-accent rounded-lg border px-4 py-2"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="border-border hover:border-primary hover:bg-accent/50 w-full rounded-lg border-2 border-dashed p-3 transition-colors"
              >
                <div className="text-center">
                  <div className="font-medium">+ Create New Mixtape</div>
                </div>
              </button>
            )}
          </div>

          {addToPlaylistMutation.isPending && (
            <div className="text-muted-foreground text-center text-sm">
              Adding to mixtape...
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
