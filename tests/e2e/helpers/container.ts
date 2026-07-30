import { GenericContainer, Wait } from "testcontainers"
import type { StartedTestContainer } from "testcontainers"
import { resolve } from "path"

let container: StartedTestContainer | null = null

export async function startMixtapeContainer(overrides?: {
  image?: string
  env?: Record<string, string>
  musicPath?: string
}): Promise<{
  container: StartedTestContainer
  baseUrl: string
}> {
  const musicFixtures =
    overrides?.musicPath ??
    resolve("tests/e2e/fixtures/music")

  container = await new GenericContainer(overrides?.image ?? "mixtape:e2e")
    .withExposedPorts(3000)
    .withBindMounts([{ source: musicFixtures, target: "/data/music" }])
    .withEnvironment({
      USE_FFMPEG: "true",
      HLS_ENABLED: "true",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin123",
      MIXTAPES_ENABLED: "true",
      ...overrides?.env,
    })
    .withWaitStrategy(Wait.forHttp("/api/ready", 3000))
    .start()

  const baseUrl = `http://localhost:${container.getMappedPort(3000)}`
  return { container, baseUrl }
}

export async function stopMixtapeContainer() {
  if (container) {
    await container.stop()
    container = null
  }
}
