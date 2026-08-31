import { test, expect } from "@playwright/test";

test("loads the studio and keeps later stages locked", async ({ page }) => {
  await page.goto("http://localhost:3001");
  await expect(
    page.getByRole("heading", { name: "AI Reel Studio" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /2\. Bilingual Captions/ })
  ).toBeDisabled();
  await expect(page.getByText("Raw Footage")).toBeVisible();
  await expect(page.getByText("AI Edited Reel")).toBeVisible();
});
