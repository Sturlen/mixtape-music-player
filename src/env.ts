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
    ENABLE_INSTRUMENTATION: z.coerce.boolean().default(false),
    AXIOM_API_TOKEN: z.string().optional(),
    AXIOM_DATASET: z.string().optional(),
    AXIOM_DOMAIN: z.string().optional(),
  },

  client: {
    // BUN_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
})
