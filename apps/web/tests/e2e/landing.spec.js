const { test, expect } = require("@playwright/test");

test.describe("CrisisLens landing page", () => {
  test("renders cinematic landing layout", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reveal the world's most overlooked crises." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Command Center" }).first()).toBeVisible();
    await expect(page.getByText("HDX")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("CrisisLens");
  });

  test("navigates to dashboard from CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Open Command Center" }).first().click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "CrisisLens Command Center" })).toBeVisible();
  });
});
