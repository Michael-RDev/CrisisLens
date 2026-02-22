const { test, expect } = require("@playwright/test");

test.describe("CrisisLens dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "CrisisLens Command Center" })).toBeVisible();
  });

  test("loads core command-center panels", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Live Global Pulse" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operations Panels" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Scenario Modeling" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Country Ops" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Priority View" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Simulation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Databricks Chat" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("CrisisLens Command Center");
  });

  test("uses a single dashboard column at desktop widths", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Live Global Pulse" })).toBeVisible();

    const trackCount = await page.evaluate(() => {
      const grid = document.querySelector("section.dashboard-grid");
      if (!grid) throw new Error("Missing dashboard grid");
      const tracks = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/);
      return tracks.filter(Boolean).length;
    });

    expect(trackCount).toBe(1);
  });

  test("opens simulation from the top button and exposes quick allocation controls", async ({ page }) => {
    await page.getByRole("button", { name: "Scenario Modeling" }).click();
    await expect(page.getByRole("heading", { name: "Funding What-if Simulator" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+1m" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+10m" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+100m" })).toBeVisible();
  });

  test("switches layer mode and updates ranking title", async ({ page }) => {
    await page.getByRole("tab", { name: "Priority View" }).click();
    await page.getByRole("button", { name: "Funding Gap" }).click();
    await expect(page.getByRole("heading", { name: "Priority Ranking (Funding Gap)" })).toBeVisible();

    await page.getByRole("button", { name: "Coverage" }).click();
    await expect(page.getByRole("heading", { name: "Priority Ranking (Coverage)" })).toBeVisible();
  });

  test("jump search updates selected country", async ({ page }) => {
    await page
      .getByPlaceholder("Jump to country (example: Sudan)")
      .fill("Germany");
    await page.getByRole("button", { name: "Jump" }).click();
    await expect(page.locator(".country-card h2")).toContainText("Germany");
  });

  test("ranking click updates selected country panel", async ({ page }) => {
    await page.getByRole("tab", { name: "Priority View" }).click();
    const rankingButtons = page.locator(".list-card ol li button");
    const count = await rankingButtons.count();
    expect(count).toBeGreaterThan(1);

    const targetCountry = ((await rankingButtons.nth(1).locator("span").first().textContent()) || "").trim();
    expect(targetCountry.length).toBeGreaterThan(2);

    await rankingButtons.nth(1).click();
    await page.getByRole("tab", { name: "Country Ops" }).click();
    await expect(page.locator(".country-card h2")).toContainText(targetCountry);
  });

  test("runs genie query and renders response output", async ({ page }) => {
    await page.getByRole("button", { name: "Open Databricks Chat" }).click();
    const genieDialog = page.getByRole("dialog", { name: "Databricks Chat" });
    await genieDialog.getByPlaceholder("Ask Databricks Genie...").fill("Rank overlooked crises for Ethiopia");
    await genieDialog.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Genie mock response")).toBeVisible();
    await expect(genieDialog.getByText("Source: mock")).toBeVisible();
    await expect(genieDialog.getByText(/coverage_mismatch_index/)).toBeVisible();
  });

  test("cv detect returns country and updates panel", async ({ page }) => {
    await page.getByRole("tab", { name: "Country Ops" }).click();
    const cvCard = page
      .locator("article.integration-card")
      .filter({ has: page.getByRole("heading", { name: "CV Point-to-Highlight" }) });

    await cvCard.getByRole("textbox").fill("frame=mock | country=Sudan");
    await cvCard.getByRole("button", { name: "Detect Country" }).click();
    await expect(cvCard.getByText(/Detected:/)).toBeVisible();
    await expect(cvCard.getByText(/Sudan/)).toBeVisible();
    await expect(cvCard.getByText(/Mock frame timestamp:/)).toBeVisible();
  });

  test("keeps globe panel inside its grid column when desktop layout is constrained", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Live Global Pulse" })).toBeVisible();

    await page.addStyleTag({
      content: "main { max-width: 520px !important; }"
    });

    const dimensions = await page.evaluate(() => {
      const grid = document.querySelector("section.dashboard-grid");
      if (!grid) {
        throw new Error("Missing dashboard grid");
      }

      const leftStack = grid.firstElementChild;
      if (!leftStack) {
        throw new Error("Missing left dashboard stack");
      }

      const heading = Array.from(document.querySelectorAll("h2")).find((element) =>
        element.textContent?.includes("Live Global Pulse")
      );
      if (!heading) {
        throw new Error("Missing globe panel heading");
      }

      const globePanel = heading.closest("article");
      if (!globePanel) {
        throw new Error("Missing globe panel");
      }

      return {
        leftStackWidth: leftStack.clientWidth,
        globePanelWidth: globePanel.clientWidth,
        globePanelScrollWidth: globePanel.scrollWidth
      };
    });

    expect(dimensions.globePanelWidth).toBeLessThanOrEqual(dimensions.leftStackWidth + 1);
    expect(dimensions.globePanelScrollWidth).toBeLessThanOrEqual(dimensions.globePanelWidth + 1);
  });
});
