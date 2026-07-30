import { unlinkSync, existsSync } from "fs"
import { stopMixtapeContainer } from "./helpers/container"

export default async function () {
  console.log("[global-teardown] Stopping mixtape Docker container...")
  await stopMixtapeContainer()
  if (existsSync(".e2e-url")) {
    unlinkSync(".e2e-url")
  }
}
