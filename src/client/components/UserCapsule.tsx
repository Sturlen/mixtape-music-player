import { Link } from "@tanstack/react-router"
import { UserIcon, LogOut, Shield, Settings } from "lucide-react"
import { useAuth } from "@/client/components/AuthProvider"

function UserCapsule() {
  const { isAuthenticated, isAdmin, user, logout, isLoading } = useAuth()

  if (isLoading) return null

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2 border-2 border-white/20 px-3 py-1.5 text-xs font-bold tracking-wide">
        <UserIcon className="h-4 w-4 text-white/70" />
        <span className="text-white/90">{user?.username}</span>
        <Link
          to="/settings"
          className="text-white/40 hover:text-white"
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>
        {isAdmin && (
          <Link to="/admin" className="text-white/40 hover:text-white">
            <Shield className="h-3.5 w-3.5" />
          </Link>
        )}
        <button
          onClick={logout}
          className="text-white/40 hover:text-white"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <Link
      to="/login"
      className="flex items-center gap-2 border-2 border-white/20 px-3 py-1.5 text-xs font-bold tracking-wide text-white/60 transition-colors hover:border-white/40 hover:text-white/90"
    >
      <UserIcon className="h-4 w-4" />
      Wanderer
    </Link>
  )
}

export default UserCapsule
