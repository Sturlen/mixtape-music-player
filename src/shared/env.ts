// src/env.mjs
import { createEnv } from "@t3-oss/env-core" // or core package
import * as z from "zod"

export const env = createEnv({
  server: {
    // DATABASE_URL: z.string().url(),
    MUSIC_PATH: z.string().min(1).default("./demo-music/"),
    MUSIC2_PATH: z.string().optional(),
    PORT: z.coerce.number().int().default(3000),
    USE_FFMPEG: z.stringbool().default(false),
    MIXTAPES_ENABLED: z.stringbool().default(false),
    DATA_PATH: z.string().min(1).default("./data"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_SERVICE_NAME: z.string().optional(),
    PG_PORT: z.coerce.number().int().default(0),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
})
