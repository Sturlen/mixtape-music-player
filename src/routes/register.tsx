import { useState, useEffect } from "react"
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"
import { useAuth } from "@/client/components/AuthProvider"
import { Button } from "@/client/components/ui/button"
import { Input } from "@/client/components/ui/input"
import { Label } from "@/client/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/client/components/ui/card"

export const Route = createFileRoute("/register")({
  component: RouteComponent,
  validateSearch: (search: Record<string, string>) => ({
    code: search.code ?? "",
  }),
})

function RouteComponent() {
  const { code } = useSearch({ from: "/register" })
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [valid, setValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (!code) {
      setValid(false)
      return
    }
    if (isAuthenticated) {
      navigate({ to: "/" })
      return
    }
    fetch(`/api/auth/register/${code}`)
      .then((r) => {
        if (!r.ok) { setValid(false); return null }
        return r.json()
      })
      .then((data) => {
        if (data) {
          setValid(true)
          setUsername(data.username)
        }
      })
      .catch(() => setValid(false))
  }, [code, isAuthenticated, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await register(code, username, password)
      navigate({ to: "/" })
    } catch {
      setError("Registration failed. The invite may have expired.")
    } finally {
      setLoading(false)
    }
  }

  if (valid === null) return null

  if (!valid) {
    return (
      <div className="mx-auto mt-20 flex max-w-sm items-center justify-center px-4">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Invalid Invite</CardTitle>
            <CardDescription>
              This invite code is invalid or already used.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-20 flex max-w-sm items-center justify-center px-4">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            You've been invited as <strong>{username}</strong>. Set your password to activate the account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={username} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Activating..." : "Activate Account"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
