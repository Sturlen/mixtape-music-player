import { test, expect } from "@playwright/test"

test("login with admin credentials and see user capsule", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator('h2:has-text("Sign In")')).toBeVisible()

  await page.fill("#username", "admin")
  await page.fill("#password", "admin123")
  await page.click('button[type="submit"]')

  await page.waitForURL("/")
  await expect(page.locator("text=admin").first()).toBeVisible()
})

test("login with wrong password shows error", async ({ page }) => {
  await page.goto("/login")
  await page.fill("#username", "admin")
  await page.fill("#password", "wrongpass")
  await page.click('button[type="submit"]')

  await expect(page.locator("text=Invalid username or password")).toBeVisible()
})
