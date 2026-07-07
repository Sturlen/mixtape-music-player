import { test, expect } from "@playwright/test"

test("login with admin credentials and see user capsule", async ({ page }) => {
  await page.goto("/login")
  await page.fill("#username", "admin")
  await page.fill("#password", "admin")
  await page.click('button[type="submit"]')
  await page.waitForURL("/")
  await expect(page.locator("text=admin").first()).toBeVisible()
})
