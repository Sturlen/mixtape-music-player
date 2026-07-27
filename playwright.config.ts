import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command:
      "NODE_ENV=production MUSIC_PATH=./demo-music DATA_PATH=./data USE_FFMPEG=0 HLS_ENABLED=0 ADMIN_USERNAME=admin ADMIN_PASSWORD=admin bun --no-env-file src/server.tsx",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
