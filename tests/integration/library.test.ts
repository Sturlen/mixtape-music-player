import { describe, test, expect } from "bun:test"
import { createTestApp, signTestToken } from "../unit/test-utils"

describe("POST /api/libary/reload", () => {
  test("returns 401 without auth", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(
      new Request("http://localhost/api/libary/reload", { method: "POST" }),
    )
    expect(res.status).toBe(401)
  })

  test("reloads library successfully", async () => {
    const { app } = await createTestApp()
    const token = await signTestToken()
    const res = await app.handle(
      new Request("http://localhost/api/libary/reload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
    )
    expect(res.status).toBe(200)
  })
})
