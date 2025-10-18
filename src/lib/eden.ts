import { treaty } from "@elysiajs/eden"
import type { App } from "@/index"

export const EdenClient = treaty<App>(document.URL)
