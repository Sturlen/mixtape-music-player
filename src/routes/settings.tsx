import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/client/components/AuthProvider"
import { useSettings } from "@/client/stores/settings"
import { useAudioPlayer } from "@/Player"
import { Button } from "@/client/components/ui/button"
import { Input } from "@/client/components/ui/input"
import { Label } from "@/client/components/ui/label"
import { Slider } from "@/client/components/ui/slider"
import { EdenClient } from "@/lib/eden"
import Page from "@/client/components/Page"
import { CATEGORIES, SETTINGS } from "@/lib/settings"
import type { SettingCategory } from "@/lib/settings"
import { Copy, Check } from "lucide-react"

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
})

function RouteComponent() {
  const { isAdmin } = useAuth()
  const [category, setCategory] = useState<SettingCategory>("appearance")

  const visibleCategories = CATEGORIES.filter(
    (c) => c.id !== "server" || isAdmin,
  )

  return (
    <Page>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>

        <div className="flex gap-2 border-b pb-2">
          {visibleCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                category === c.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {category === "appearance" && <AppearanceSettings />}
        {category === "playback" && <PlaybackSettings />}
        {category === "server" && isAdmin && <ServerSettings />}
      </div>
    </Page>
  )
}

function AppearanceSettings() {
  const { values, setSetting } = useSettings()

  const def = SETTINGS.find((s) => s.key === "theme")!
  const value = (values.theme ?? def.defaultValue) as string

  return (
    <SettingCard label={def.label} description={def.description}>
      <select
        value={value}
        onChange={(e) => setSetting(def.key, e.target.value)}
        className="bg-background border-input rounded-md border px-3 py-1.5 text-sm"
      >
        {def.options?.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </SettingCard>
  )
}

function PlaybackSettings() {
  const { values, setSetting } = useSettings()

  const def = SETTINGS.find((s) => s.key === "playback_speed")!
  const value = (values.playback_speed ?? def.defaultValue) as number

  return (
    <SettingCard label={def.label} description={def.description}>
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          min={def.min}
          max={def.max}
          step={def.step}
          onValueChange={([v]) => {
            if (v == null) return
            setSetting(def.key, v)
            useAudioPlayer.getState().setPlaybackRate(v)
          }}
          className="w-40"
        />
        <span className="text-muted-foreground min-w-[3ch] text-sm tabular-nums">
          {value}x
        </span>
      </div>
    </SettingCard>
  )
}

function SettingCard({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ServerSettings() {
  const queryClient = useQueryClient()

  const { data, error } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data } = await EdenClient.api.admin.settings.get()
      if (!data) throw new Error("Failed to load settings")
      return data.settings as Record<string, string>
    },
  })

  const mutation = useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const { data } = await EdenClient.api.admin.settings.put(settings)
      if (data && "error" in data) throw new Error("Failed to save")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
    },
  })

  const ffmpegDef = SETTINGS.find((s) => s.key === "ffmpeg_enabled")!
  const ffmpegOn = data?.ffmpeg_enabled === "true"

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Server Settings</h2>
      {error && <p className="text-red-500">Failed to load server settings</p>}

      <div className="bg-card flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">{ffmpegDef.label}</Label>
          <p className="text-muted-foreground text-sm">
            {ffmpegDef.description}
          </p>
        </div>
        <button
          onClick={() => {
            const next = !(data?.ffmpeg_enabled === "true")
            mutation.mutate({ ffmpeg_enabled: next })
          }}
          disabled={mutation.isPending}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${
            ffmpegOn ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              ffmpegOn ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <hr className="border-muted" />

      <h2 className="text-xl font-semibold">Users</h2>
      <UserList />

      <h2 className="text-xl font-semibold">Invitations</h2>
      <InvitationsSection />
    </div>
  )
}

interface UserItem {
  id: string
  username: string
  role: string
  isActive: boolean
  createdAt: Date | null
}

function UserList() {
  const queryClient = useQueryClient()

  const { data, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data } = await EdenClient.api.admin.users.get()
      if (!data) throw new Error("Failed to load users")
      return data.users as UserItem[]
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await EdenClient.api.admin.users({ id }).delete()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })

  if (error) return <p className="text-red-500">Failed to load users</p>
  if (!data) return <p>Loading users...</p>

  return (
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
          {user.role !== "admin" && user.isActive && (
            <Button
              variant="destructive"
              size="xs"
              onClick={() => deactivateMutation.mutate(user.id)}
              disabled={deactivateMutation.isPending}
            >
              Disable
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

interface InvitationItem {
  id: string
  code: string
  username: string
  isUsed: boolean
  createdAt: Date | null
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
    <div className="space-y-4">
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
                  {inv.createdAt
                    ? new Date(inv.createdAt).toLocaleDateString()
                    : ""}
                </span>
                {!inv.isUsed && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => copyLink(inv.code)}
                  >
                    {copiedId === inv.code ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
