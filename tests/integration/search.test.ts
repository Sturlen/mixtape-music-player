import { describe, test, expect } from "bun:test"
import { createTestApp } from "../unit/test-utils"

describe("GET /api/search", () => {
  test("search returns object even without results", async () => {
    const { app } = await createTestApp()
    const res = await app.handle(
      new Request("http://localhost/api/search?q=test"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeDefined()
  })
})
