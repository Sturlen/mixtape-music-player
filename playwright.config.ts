import { defineConfig } from "@playwright/test"
import { readFileSync, existsSync } from "fs"

let baseUrl = "http://localhost:3000"
if (existsSync(".e2e-url")) {
  baseUrl = readFileSync(".e2e-url", "utf-8").trim()
}

export default defineConfig({
  testDir: "./tests/playwright",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  use: {
    baseURL: baseUrl,
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
})
