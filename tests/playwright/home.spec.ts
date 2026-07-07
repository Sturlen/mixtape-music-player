import { test, expect } from "@playwright/test"

test("homepage loads with stats and navigation", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("h1.font-battle")).toContainText("MIXTAPE")
  const statValues = page.locator(".text-6xl.font-black")
  await expect(statValues.first()).toBeVisible()
  const nav = page.locator("nav")
  await expect(nav.locator('a:has-text("Albums")')).toBeVisible()
  await expect(nav.locator('a:has-text("Artists")')).toBeVisible()
  await expect(nav.locator('a:has-text("Mixtapes")')).toBeVisible()
})
