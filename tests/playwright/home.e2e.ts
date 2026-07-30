import { test, expect } from "@playwright/test"

test("homepage loads with stats and navigation", async ({ page }) => {
  await page.goto("/")

  const logo = page.locator("h1.font-battle")
  await expect(logo).toContainText("MIXTAPE")

  const nav = page.locator("nav")
  await expect(nav.locator('a:has-text("Albums")')).toBeVisible()
  await expect(nav.locator('a:has-text("Artists")')).toBeVisible()
  await expect(nav.locator('a:has-text("Mixtapes")')).toBeVisible()
  await expect(nav.locator('a:has-text("Libraries")')).toBeVisible()
  await expect(nav.locator('a:has-text("Settings")')).toBeVisible()

  await expect(page.locator("text=YOUR COLLECTION")).toBeVisible()
  await expect(page.locator("text=TRACKS")).toBeVisible()
  await expect(page.locator("text=ARTISTS")).toBeVisible()
  await expect(page.locator("text=ALBUMS")).toBeVisible()
})
