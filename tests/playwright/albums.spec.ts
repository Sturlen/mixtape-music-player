import { test, expect } from "@playwright/test"

test("navigate to albums page and open album detail", async ({ page }) => {
  await page.goto("/albums")
  const albumLink = page.locator('a[href^="/albums/"]').first()
  await expect(albumLink).toBeVisible()
  await albumLink.click()
  await page.waitForURL(/\/albums\/\w+/)
  const trackRows = page.locator('li[id^="track-"]')
  await expect(trackRows.first()).toBeVisible()
})
