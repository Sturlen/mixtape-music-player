// src/env.mjs
import { createEnv } from "@t3-oss/env-core" // or core package
import { z } from "zod"

export const env = createEnv({
  clientPrefix: "BUN_PUBLIC_",

  server: {
    // DATABASE_URL: z.string().url(),
    MUSIC_PATH: z.string().min(1),
  },

  client: {
    // BUN_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
})
