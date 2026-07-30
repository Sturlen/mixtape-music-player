import { writeFileSync } from "fs"
import { startMixtapeContainer } from "./helpers/container"

export default async function () {
  console.log("[global-setup] Starting mixtape Docker container...")
  const { baseUrl } = await startMixtapeContainer()
  console.log("[global-setup] Container ready at", baseUrl)
  writeFileSync(".e2e-url", baseUrl, "utf-8")
}
