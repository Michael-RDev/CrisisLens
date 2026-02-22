const { test, expect } = require("@playwright/test");

test.describe("CrisisLens dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  });

  test("loads core command-center panels", async ({ page }) => {
    await expect(page.getByText("Map Layers").first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:visible', { hasText: "Country Data" })).toBeVisible();
    await expect(page.locator('button[role="tab"]:visible', { hasText: "Insights" })).toBeVisible();
    await expect(page.locator('button[role="tab"]:visible', { hasText: "Visuals" })).toBeVisible();
    await expect(page.locator('button:visible', { hasText: "Jump" }).first()).toBeVisible();
  });

  test("switches map layers from sidebar controls", async ({ page }) => {
    await page.getByRole("button", { name: "Funding Gap" }).first().click();
    await expect(page.getByRole("button", { name: "Funding Gap" }).first()).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Coverage" }).first().click();
    await expect(page.getByRole("button", { name: "Coverage" }).first()).toHaveAttribute("aria-pressed", "true");
  });

  test("jump search updates selected country", async ({ page }) => {
    await page.locator('input[placeholder="Country or ISO3"]:visible').fill("Germany");
    await page.locator('button:visible', { hasText: "Jump" }).first().click();
    await expect(page.getByText("Germany (DEU)").first()).toBeVisible();
  });

  test("country brief contains insights deep-link", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Open in Insights" }).first()).toBeVisible();
  });
});
