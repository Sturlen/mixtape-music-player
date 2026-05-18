import { treaty } from "@elysiajs/eden"
import type { App } from "@/index"

export const EdenClient = treaty<App>(window.location.origin, {
  headers: () => {
    const token = localStorage.getItem("token")
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
  },
})
