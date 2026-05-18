import { useState, useEffect, use, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
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

interface AuthStatus {
  hasUsers: boolean
}

export const Route = createFileRoute("/login")({
  component: RouteComponent,
})

function RouteComponent() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [hasUsers, setHasUsers] = useState<boolean | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/" })
      return
    }

    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data: AuthStatus) => setHasUsers(data.hasUsers))
      .catch(() => setHasUsers(true))
  }, [isAuthenticated, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(username, password)
      navigate({ to: "/" })
    } catch {
      if (hasUsers === false) {
        setError("Failed to create admin account")
      } else {
        setError("Invalid username or password")
      }
    } finally {
      setLoading(false)
    }
  }

  const [usernamePlaceholder, setUsernamePlaceholder] = useState("Gamertag")
  const [passwordPlaceholder, setPasswordPlaceholder] =
    useState("Mum's the word")

  useEffect(() => {
    const randomUsernamePlaceholders = [
      "Gamertag",
      "Username",
      "Username",
      "Username",
      "Callsign",
      "What your friends call you",
    ]
    const randomPasswordPlaceholders = [
      "Your Password Here",
      "Don't tell this to anyone",
      "You can keep a secret, right?",
      "Mum's the word",
      "Passwordle",
      "Password",
      "Password",
      "Password",
      "Password",
    ]
    setUsernamePlaceholder(
      randomUsernamePlaceholders[
        Math.floor(Math.random() * randomUsernamePlaceholders.length)
      ] as string,
    )
    setPasswordPlaceholder(
      randomPasswordPlaceholders[
        Math.floor(Math.random() * randomPasswordPlaceholders.length)
      ] as string,
    )
  }, [])

  if (isAuthenticated || hasUsers === null) return null

  const isFirstRun = hasUsers === false

  return (
    <div className="mx-auto mt-20 flex max-w-sm items-center justify-center px-4">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isFirstRun ? "Create Admin Account" : "Sign In"}
          </CardTitle>
          <CardDescription>
            {isFirstRun
              ? "This is the first launch. Set up your admin credentials."
              : "Enter your credentials to access your music."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Gamertag"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                pattern="[a-z]([a-z0-9_]*[a-z0-9])?"
                title="Lowercase letters, numbers, and underscores only. No leading/trailing underscores."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? isFirstRun
                  ? "Creating account..."
                  : "Signing in..."
                : isFirstRun
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
