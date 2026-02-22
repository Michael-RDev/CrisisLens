const { test, expect } = require("@playwright/test");

test.describe("CrisisLens landing page", () => {
  test("renders landing navigation, hero, and footer", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("link", { name: "CrisisLens", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reveal the world's most overlooked crises." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Command Center" }).first()).toBeVisible();
    await expect(page.getByText("© 2026 CrisisLens. All rights reserved.")).toBeVisible();
  });

  test("navigates to dashboard from CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Open Command Center" }).first().click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  });
});
