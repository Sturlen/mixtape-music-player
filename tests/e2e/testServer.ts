import { spawn, type Subprocess } from "bun"

let serverProcess: Subprocess | null = null
let baseUrl = ""

export async function startServer() {
  if (serverProcess) return baseUrl

  const port = Math.floor(Math.random() * 10000) + 30000

  serverProcess = spawn({
    cmd: ["bun", "--no-env-file", "src/index.tsx"],
    env: {
      NODE_ENV: "test",
      PORT: String(port),
      MUSIC_PATH: "./demo-music",
      DATA_PATH: "./data",
      USE_FFMPEG: "0",
    },
    stdout: "pipe",
    stderr: "pipe",
  })

  await waitForServer(port)

  baseUrl = `http://localhost:${port}`
  return baseUrl
}

export async function stopServer() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
}

export function getBaseUrl() {
  return baseUrl
}

async function waitForServer(port: number, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}/api/stats`)
      if (res.ok) return
    } catch {
      // server not ready, retry
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error("Server failed to start")
}
