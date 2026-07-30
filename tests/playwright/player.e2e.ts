import { test, expect } from "@playwright/test"

test("click a track and verify audio playback with correct metadata", async ({ page }) => {
  await page.goto("/login")
  await page.fill("#username", "admin")
  await page.fill("#password", "admin123")
  await page.click('button[type="submit"]')
  await page.waitForURL("/")

  await page.goto("/albums")
  const albumLink = page.locator('a[href^="/albums/"]').first()
  await albumLink.click()
  await page.waitForURL(/\/albums\//)

  const trackRow = page.locator('ol li[id^="track-"]').first()
  const trackName = await trackRow.locator(".pointer-events-none").textContent()
  expect(trackName).not.toBeNull()

  await trackRow.click()

  await page.waitForFunction(
    () => {
      const audio = document.querySelector("audio")
      return audio && audio.currentTime > 0
    },
    { timeout: 15000 },
  )

  const currentTime = await page.evaluate(() => {
    const audio = document.querySelector("audio")
    return audio ? audio.currentTime : 0
  })
  expect(currentTime).toBeGreaterThan(0)

  const scroller = page.locator(".text-blue-400")
  await expect(scroller).not.toContainText("No Track Playing")
  await expect(scroller).toContainText(trackName!.trim())
})
