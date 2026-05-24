import { useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/client/components/AuthProvider"

export const Route = createFileRoute("/admin/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      navigate({ to: "/login" })
    } else if (!isAdmin) {
      navigate({ to: "/" })
    } else {
      navigate({ to: "/settings" })
    }
  }, [isLoading, isAuthenticated, isAdmin, navigate])

  return null
}
