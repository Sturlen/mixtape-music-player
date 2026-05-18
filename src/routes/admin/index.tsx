import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/client/components/AuthProvider"
import { Button } from "@/client/components/ui/button"
import { Input } from "@/client/components/ui/input"
import { Label } from "@/client/components/ui/label"
import { EdenClient } from "@/lib/eden"
import Page from "@/client/components/Page"
import { Copy, Check } from "lucide-react"

export const Route = createFileRoute("/admin/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  if (isLoading) return null

  if (!isAuthenticated) {
    navigate({ to: "/login" })
    return null
  }

  if (!isAdmin) {
    return (
      <Page>
        <p className="text-center text-lg">You don't have access to this page.</p>
      </Page>
    )
  }

  return <AdminPanel />
}

function AdminPanel() {
  return (
    <Page>
      <div className="mx-auto max-w-2xl space-y-10">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <UserList />
        <InvitationsSection />
      </div>
    </Page>
  )
}

interface UserItem {
  id: string
  username: string
  role: string
  isActive: boolean
  createdAt: Date | null
}

interface InvitationItem {
  id: string
  code: string
  username: string
  isUsed: boolean
  createdAt: Date | null
}

function UserList() {
  const { data, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data } = await EdenClient.api.admin.users.get()
      if (!data) throw new Error("Failed to load users")
      return data.users as UserItem[]
    },
  })

  if (error) return <p className="text-red-500">Failed to load users</p>
  if (!data) return <p>Loading users...</p>

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Users</h2>
      <div className="space-y-2">
        {data.map((user) => (
          <div
            key={user.id}
            className="bg-card flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <span className="font-medium">{user.username}</span>
              <span className="text-muted-foreground ml-2 text-sm">
                {user.role === "admin" ? "Admin" : "User"}
              </span>
              {!user.isActive && (
                <span className="ml-2 text-sm text-red-500">(Disabled)</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function InvitationsSection() {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data, error } = useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: async () => {
      const { data } = await EdenClient.api.admin.invitations.get()
      if (!data) throw new Error("Failed to load invitations")
      return data.invitations as InvitationItem[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (username: string) => {
      const { data } = await EdenClient.api.admin.invitations.post({ username })
      if (!data) throw new Error("Failed to create invitation")
      const invite = data.invitation as { code: string; link: string }
      const fullLink = `${window.location.origin}${invite.link}`
      navigator.clipboard.writeText(fullLink)
      return invite
    },
    onSuccess: () => {
      setUsername("")
      queryClient.invalidateQueries({ queryKey: ["admin", "invitations"] })
    },
  })

  function copyLink(code: string) {
    const link = `${window.location.origin}/register?code=${code}`
    navigator.clipboard.writeText(link)
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Invitations</h2>

      <div className="bg-card space-y-4 rounded-lg border p-4">
        <h3 className="font-medium">Create New Invite</h3>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="invite-username">Username</Label>
            <Input
              id="invite-username"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={2}
              maxLength={32}
              pattern="[a-z]([a-z0-9_]*[a-z0-9])?"
              title="Lowercase letters, numbers, and underscores only. No leading/trailing underscores."
            />
          </div>
          <Button
            onClick={() => createMutation.mutate(username)}
            disabled={createMutation.isPending || username.length < 2}
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
        {createMutation.isError && (
          <p className="text-sm text-red-500">
            Failed to create invite. Username may already be taken.
          </p>
        )}
      </div>

      {error && <p className="text-red-500">Failed to load invitations</p>}

      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((inv) => (
            <div
              key={inv.id}
              className="bg-card flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full ${
                    inv.isUsed ? "bg-gray-500" : "bg-green-500"
                  }`}
                />
                <span className="font-medium">{inv.username}</span>
                <span className="text-muted-foreground">
                  {inv.isUsed ? "Activated" : "Pending"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : ""}
                </span>
                {!inv.isUsed && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => copyLink(inv.code)}
                  >
                    {copiedId === inv.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
