import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { EdenClient } from "@/lib/eden"

interface User {
  id: string
  username: string
  role: "admin" | "user"
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  register: (code: string, username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    EdenClient.api.auth.me
      .get()
      .then(({ data, error }) => {
        if (error || !data?.user) {
          localStorage.removeItem("token")
          setToken(null)
          setUser(null)
        } else {
          setUser(data.user as User)
        }
      })
      .finally(() => setIsLoading(false))
  }, [token])

  const login = useCallback(async (username: string, password: string) => {
    const { data, error } = await EdenClient.api.auth.login.post({
      username,
      password,
    })
    if (error || !data) throw new Error("Login failed")
    const { token: newToken, user: userData } = data
    localStorage.setItem("token", newToken)
    setToken(newToken)
    setUser(userData as User)
  }, [])

  const register = useCallback(
    async (code: string, _username: string, password: string) => {
      const { data, error } = await EdenClient.api.auth.register({ code }).post({
        password,
      })
      if (error || !data) throw new Error("Registration failed")
      const { token: newToken, user: userData } = data
      localStorage.setItem("token", newToken)
      setToken(newToken)
      setUser(userData as User)
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
