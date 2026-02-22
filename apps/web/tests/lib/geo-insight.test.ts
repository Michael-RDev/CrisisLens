import { describe, expect, it } from "vitest";
import {
  extractJsonObject,
  mapRowToGeoMetrics,
  parseGeoInsightResponse,
  resolveIso3,
  seedCountryIsoMapForTests,
  type GeoMetrics
} from "@/lib/geo-insight";

const sampleMetrics: GeoMetrics = {
  iso3: "HTI",
  country: "Haiti",
  year: 2026,
  people_in_need: 5_200_000,
  people_targeted: 2_000_000,
  funding_usd: 220_000_000,
  requirements_usd: 650_000_000,
  funding_gap_usd: 430_000_000,
  funding_coverage_ratio: 0.338,
  funding_gap_per_person: 82.69,
  coverage_pct: 33.8
};

describe("geo-insight helpers", () => {
  it("resolves iso3 directly and by cached country name", async () => {
    seedCountryIsoMapForTests([["Haiti", "HTI"]]);

    await expect(resolveIso3({ iso3: "hti" })).resolves.toBe("HTI");
    await expect(resolveIso3({ country: "haiti" })).resolves.toBe("HTI");
  });

  it("maps SQL row into stable metrics with derived fields", () => {
    const mapped = mapRowToGeoMetrics({
      iso3: "HTI",
      country: "Haiti",
      year: 2026,
      people_in_need: 100,
      people_targeted: 20,
      funding_usd: 25,
      requirements_usd: 100,
      funding_coverage_ratio: 0.25
    });

    expect(mapped.coverage_pct).toBe(25);
    expect(mapped.funding_gap_usd).toBe(75);
    expect(mapped.funding_gap_per_person).toBe(0.75);
  });

  it("extracts json from fenced output and parses valid insight json", () => {
    const raw =
      "```json\n{\"headline\":\"Haiti underfunded\",\"summary\":\"Gap remains high\",\"flags\":[\"a\",\"b\",\"c\"],\"followups\":[\"q1\",\"q2\",\"q3\"]}\n```";

    expect(extractJsonObject(raw)).toContain("headline");
    const parsed = parseGeoInsightResponse(raw, sampleMetrics);
    expect(parsed.source).toBe("ai");
    expect(parsed.insight.headline).toBe("Haiti underfunded");
    expect(parsed.insight.flags).toHaveLength(3);
    expect(parsed.insight.followups).toHaveLength(3);
  });

  it("falls back when ai output is malformed", () => {
    const parsed = parseGeoInsightResponse("not-json-output", sampleMetrics);
    expect(parsed.source).toBe("fallback");
    expect(parsed.insight.headline).toContain("HTI");
    expect(parsed.insight.flags).toHaveLength(3);
    expect(parsed.insight.followups).toHaveLength(3);
  });
});
