const { test, expect } = require("@playwright/test");

test.describe("CrisisLens landing page", () => {
  test("renders sectioned landing layout", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("heading", { name: "CrisisLens" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Live Global Pulse" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational Briefing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What You Can Monitor" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "From Alert to Action" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Platform Footprint" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Launch Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "See Workflow" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("CrisisLens");
  });

  test("navigates to dashboard from CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Launch Dashboard" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "CrisisLens Command Center" })).toBeVisible();
  });
});
