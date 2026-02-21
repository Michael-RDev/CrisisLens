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
    expect(agentResponse.ok()).toBeTruthy();
    const agent = await agentResponse.json();
    expect(agent.iso3).toBe(iso3);
    expect(typeof agent.narrative).toBe("string");
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
