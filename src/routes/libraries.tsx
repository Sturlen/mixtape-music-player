import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { EdenClient } from "@/lib/eden"
import Page from "@/client/components/Page"
import { Library, Plus, Trash2, RefreshCw } from "lucide-react"
import { useState } from "react"

export const Route = createFileRoute("/libraries")({
  component: RouteComponent,
})

async function getLibraries() {
  const { data, error } = await EdenClient.api.libraries.get()
  if (error) throw error
  return data
}

function useLibraries() {
  return useQuery({ queryKey: ["libraries"], queryFn: getLibraries })
}

function RouteComponent() {
  const queryClient = useQueryClient()
  const { data, error } = useLibraries()
  const [showForm, setShowForm] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => EdenClient.api.libraries({ id }).delete(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["libraries"] }),
  })

  const scanMutation = useMutation({
    mutationFn: (id: string) => EdenClient.api.libraries({ id }).scan.post(),
  })

  return (
    <Page>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold md:text-5xl lg:text-6xl">
          Libraries
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2"
        >
          <Plus className="h-4 w-4" />
          Add Library
        </button>
      </div>

      {showForm && (
        <AddLibraryForm
          onDone={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ["libraries"] })
          }}
        />
      )}

      {error && <div className="p-8 text-red-500">Error loading libraries</div>}
      {!data && <div className="p-8">Loading...</div>}

      {data?.libraries && (
        <div className="space-y-4">
          {data.libraries.length === 0 && (
            <div className="text-muted-foreground p-8 text-center">
              No libraries configured. Add one to get started.
            </div>
          )}
          {data.libraries.map((lib) => (
            <LibraryCard
              key={lib.id}
              lib={lib}
              onDelete={() => deleteMutation.mutate(lib.id)}
              onScan={() => scanMutation.mutate(lib.id)}
            />
          ))}
        </div>
      )}
    </Page>
  )
}

function AddLibraryForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("")
  const [rootPath, setRootPath] = useState("")

  const createMutation = useMutation({
    mutationFn: () =>
      EdenClient.api.libraries.post({ name, rootPath }),
    onSuccess: () => onDone(),
  })

  return (
    <div className="bg-card mb-6 rounded-lg border p-4">
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            className="bg-background w-full rounded-md border px-3 py-2"
            placeholder="My Music"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Path</label>
          <input
            className="bg-background w-full rounded-md border px-3 py-2"
            placeholder="/media/music"
            value={rootPath}
            onChange={(e) => setRootPath(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => createMutation.mutate()}
          disabled={!name || !rootPath || createMutation.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 disabled:opacity-50"
        >
          {createMutation.isPending ? "Scanning..." : "Create"}
        </button>
        <button
          onClick={onDone}
          className="hover:bg-secondary rounded-md px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function LibraryCard({
  lib,
  onDelete,
  onScan,
}: {
  lib: { id: string; name: string; rootPath: string; enabled: boolean }
  onDelete: () => void
  onScan: () => void
}) {
  return (
    <div className="bg-card flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Library className="text-muted-foreground h-5 w-5" />
        <div>
          <div className="font-medium">{lib.name}</div>
          <div className="text-muted-foreground text-sm">{lib.rootPath}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onScan}
          className="hover:bg-secondary rounded-md p-2"
          title="Scan library"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="hover:bg-destructive/10 hover:text-destructive rounded-md p-2 text-red-500"
          title="Delete library"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
