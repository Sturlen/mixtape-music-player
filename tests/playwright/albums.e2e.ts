import { test, expect } from "@playwright/test"

test("navigate to albums page and open album detail", async ({ page }) => {
  await page.goto("/albums")

  await expect(page.locator("h1:has-text('Albums')")).toBeVisible()

  const albumLink = page.locator('a[href^="/albums/"]').first()
  await expect(albumLink).toBeVisible()
  const albumName = await albumLink.textContent()
  expect(albumName).not.toBeNull()

  await albumLink.click()
  await page.waitForURL(/\/albums\//)

  await expect(page.locator("text=Album")).toBeVisible()
  await expect(page.locator("text=tracks")).toBeVisible()

  const trackRows = page.locator('ol > li[id^="track-"]')
  await expect(trackRows.first()).toBeVisible()
  const trackCount = await trackRows.count()
  expect(trackCount).toBeGreaterThan(0)
})
