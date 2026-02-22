const { test, expect } = require("@playwright/test");

test.describe("API route contracts", () => {
  test("heatmap, country drilldown, and agent state return valid shapes", async ({ request }) => {
    const heatmapResponse = await request.get("/api/globe-heatmap");
    expect(heatmapResponse.ok()).toBeTruthy();

    const heatmapRows = await heatmapResponse.json();
    expect(Array.isArray(heatmapRows)).toBeTruthy();
    expect(heatmapRows.length).toBeGreaterThan(0);

    const iso3 = heatmapRows[0].country_iso3;
    expect(typeof iso3).toBe("string");
    expect(iso3).toHaveLength(3);

    const countryResponse = await request.get(`/api/country?iso3=${iso3}`);
    expect(countryResponse.ok()).toBeTruthy();
    const country = await countryResponse.json();
    expect(country.iso3).toBe(iso3);
    expect(Array.isArray(country.cluster_breakdown)).toBeTruthy();
    expect(country.cluster_breakdown.length).toBeGreaterThan(0);
    expect(Array.isArray(country.hrp_project_list)).toBeTruthy();
    expect(country.hrp_project_list.length).toBeGreaterThan(0);

    const agentResponse = await request.get(`/api/agent?iso3=${iso3}`);
    expect([200, 503]).toContain(agentResponse.status());
    const agent = await agentResponse.json();
    if (agentResponse.status() === 200) {
      expect(agent.iso3).toBe(iso3);
      expect(typeof agent.narrative).toBe("string");
    } else {
      expect(typeof agent.error).toBe("string");
    }
  });

  test("project, genie, and cv endpoints return expected data", async ({ request }) => {
    const heatmapResponse = await request.get("/api/globe-heatmap");
    expect(heatmapResponse.ok()).toBeTruthy();
    const heatmapRows = await heatmapResponse.json();
    const iso3 = heatmapRows[0].country_iso3;

    const countryResponse = await request.get(`/api/country?iso3=${iso3}`);
    expect(countryResponse.ok()).toBeTruthy();
    const country = await countryResponse.json();
    const projectId = country.hrp_project_list?.[0]?.project_id;
    if (projectId) {
      expect(typeof projectId).toBe("string");
      expect(projectId.length).toBeGreaterThan(3);

      const projectResponse = await request.get(`/api/project?projectId=${projectId}`);
      expect(projectResponse.ok()).toBeTruthy();
      const project = await projectResponse.json();
      expect(project.project_id).toBe(projectId);
      expect(Array.isArray(project.comparable_projects)).toBeTruthy();
      expect(project.comparable_projects.length).toBeGreaterThan(0);
    } else {
      const missingProjectResponse = await request.get("/api/project?projectId=MISSING-PROJECT-ID");
      expect(missingProjectResponse.status()).toBe(404);
    }

    const genieResponse = await request.post("/api/genie-query", {
      data: {
        nl_query: "Rank top overlooked crises",
        iso3
      }
    });
    expect(genieResponse.ok()).toBeTruthy();
    const genie = await genieResponse.json();
    expect(typeof genie.answer).toBe("string");
    expect(genie.highlight_iso3).toContain(iso3);

    const cvResponse = await request.post("/api/cv-detect", {
      data: {
        imageDataUrl: "frame data country SDN"
      }
    });
    expect(cvResponse.ok()).toBeTruthy();
    const cv = await cvResponse.json();
    expect(cv.status).toBe("detected");
    expect(cv.detection.iso3).toBe("SDN");

    const simulationResponse = await request.post("/api/analytics/simulate", {
      data: {
        iso3,
        allocation_usd: 5_000_000
      }
    });
    expect(simulationResponse.ok()).toBeTruthy();
    const simulation = await simulationResponse.json();
    expect(simulation.iso3).toBe(iso3);
    expect(typeof simulation.ml_context?.source_path).toBe("string");
    expect(typeof simulation.ml_context?.projection_points).toBe("number");
    expect(Array.isArray(simulation.quarters)).toBeTruthy();
    expect(simulation.quarters.length).toBe(8);
    expect(Array.isArray(simulation.impact_arrows)).toBeTruthy();
  });

  test("validation errors return 400 for bad payloads", async ({ request }) => {
    const badCountry = await request.get("/api/country?iso3=XX");
    expect(badCountry.status()).toBe(400);

    const badAgent = await request.get("/api/agent?iso3=XX");
    expect(badAgent.status()).toBe(400);

    const badGenie = await request.post("/api/genie-query", {
      data: {}
    });
    expect(badGenie.status()).toBe(400);

    const badCv = await request.post("/api/cv-detect", {
      data: {}
    });
    expect(badCv.status()).toBe(400);
  });
});

test.describe("Geo insight routes", () => {
  test("geo routes validate bad requests", async ({ request }) => {
    const badMetrics = await request.get("/api/geo/metrics");
    expect(badMetrics.status()).toBe(400);

    const badInsight = await request.get("/api/geo/insight");
    expect(badInsight.status()).toBe(400);

    const badSummary = await request.post("/api/geo/summary", {
      data: {}
    });
    expect(badSummary.status()).toBe(400);

    const badQuery = await request.post("/api/geo/query", {
      data: {}
    });
    expect(badQuery.status()).toBe(400);
  });

  test("geo metrics and insight can return databricks-backed payload", async ({ request }) => {
    test.skip(!process.env.DATABRICKS_TOKEN, "Databricks env is not available in test runtime.");

    const metrics = await request.get("/api/geo/metrics?iso3=HTI");
    expect(metrics.ok()).toBeTruthy();
    const metricsBody = await metrics.json();
    expect(metricsBody.ok).toBe(true);
    expect(metricsBody.data.iso3).toBe("HTI");

    const insight = await request.get("/api/geo/insight?iso3=HTI");
    expect(insight.ok()).toBeTruthy();
    const insightBody = await insight.json();
    expect(insightBody.ok).toBe(true);
    expect(insightBody.data.metrics.iso3).toBe("HTI");
    expect(typeof insightBody.data.insight.summary).toBe("string");
  });
});
