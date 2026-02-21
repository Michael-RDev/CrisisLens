const { test, expect } = require("@playwright/test");

test.describe("CrisisLens dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "CrisisLens Command Center" })).toBeVisible();
  });

  test("loads core command-center panels", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Databricks Agent State" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mock Risk Drivers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Databricks Genie (NLQ)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "CV Point-to-Highlight" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run Genie Query" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("CrisisLens Command Center");
  });

  test("switches layer mode and updates ranking title", async ({ page }) => {
    await page.getByRole("button", { name: "Funding Gap" }).click();
    await expect(page.getByRole("heading", { name: "Priority Ranking (Funding Gap)" })).toBeVisible();

    await page.getByRole("button", { name: "Coverage" }).click();
    await expect(page.getByRole("heading", { name: "Priority Ranking (Coverage)" })).toBeVisible();
  });

  test("jump search updates selected country", async ({ page }) => {
    await page
      .getByPlaceholder("Jump to country or ISO3 (example: Sudan, SDN)")
      .fill("Germany (DEU)");
    await page.getByRole("button", { name: "Jump" }).click();
    await expect(page.locator(".country-card h2")).toContainText("DEU");
  });

  test("ranking click updates selected country panel", async ({ page }) => {
    const rankingButtons = page.locator(".list-card ol li button");
    const count = await rankingButtons.count();
    expect(count).toBeGreaterThan(1);

    const targetIso = ((await rankingButtons.nth(1).locator("small").textContent()) || "").trim();
    expect(targetIso.length).toBe(3);

    await rankingButtons.nth(1).click();
    await expect(page.locator(".country-card h2")).toContainText(targetIso);
  });

  test("runs genie query and renders response output", async ({ page }) => {
    const genieCard = page
      .locator("article.integration-card")
      .filter({ has: page.getByRole("heading", { name: "Databricks Genie (NLQ)" }) });
    await genieCard.getByRole("textbox").fill("Rank overlooked crises for ETH");
    await page.getByRole("button", { name: "Run Genie Query" }).click();
    await expect(page.getByText("Genie mock response")).toBeVisible();
    await expect(genieCard.getByText("Source: mock")).toBeVisible();
    await expect(genieCard.getByText(/coverage_mismatch_index/)).toBeVisible();
  });

  test("cv detect returns country and updates panel", async ({ page }) => {
    const cvCard = page
      .locator("article.integration-card")
      .filter({ has: page.getByRole("heading", { name: "CV Point-to-Highlight" }) });

    await cvCard.getByRole("textbox").fill("frame=mock | country=SDN");
    await cvCard.getByRole("button", { name: "Detect Country" }).click();
    await expect(cvCard.getByText(/Detected:/)).toBeVisible();
    await expect(cvCard.getByText(/Mock frame timestamp:/)).toBeVisible();
  });
});
