// src/env.mjs
import { createEnv } from "@t3-oss/env-core" // or core package
import * as z from "zod"

export const env = createEnv({
  clientPrefix: "BUN_PUBLIC_",

  server: {
    // DATABASE_URL: z.string().url(),
    MUSIC_PATH: z.string().min(1).default("./demo-music/"),
    MUSIC2_PATH: z.string().optional(),
    PORT: z.coerce.number().int().default(3000),
    USE_FFMPEG: z.stringbool().default(false),
  },

  client: {
    // BUN_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
})
