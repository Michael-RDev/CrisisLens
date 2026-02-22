import { describe, expect, it } from "vitest";
import { buildInsightMetrics, resolveCountryIso3 } from "@/lib/country-insights";
import { CountryMetrics } from "@/lib/types";

const rows: CountryMetrics[] = [
  {
    iso3: "AAA",
    country: "Aland",
    population: 1_000,
    inNeed: 500,
    targeted: 320,
    affected: 300,
    reached: 200,
    fundingRequired: 100,
    fundingReceived: 20,
    percentFunded: 20,
    revisedPlanRequirements: 110,
    latestFundingYear: 2026,
    severityScore: 90
  },
  {
    iso3: "BBB",
    country: "Borland",
    population: 2_000,
    inNeed: 300,
    targeted: 250,
    affected: 220,
    reached: 210,
    fundingRequired: 100,
    fundingReceived: 95,
    percentFunded: 95,
    revisedPlanRequirements: 100,
    latestFundingYear: 2026,
    severityScore: 40
  }
];

describe("country insight metrics", () => {
  it("resolves ISO2 and ISO3 inputs", () => {
    expect(resolveCountryIso3("eth")).toBe("ETH");
    expect(resolveCountryIso3("et")).toBe("ETH");
    expect(resolveCountryIso3("??")).toBeNull();
  });

  it("builds lightweight card metrics with rank and chart points", () => {
    const payload = buildInsightMetrics("AAA", rows);
    expect(payload.countryCode).toBe("AAA");
    expect(payload.cards.pin).toBe(500);
    expect(payload.cards.funding).toBe(20);
    expect(payload.cards.rank).toBe(1);
    expect(payload.chart.length).toBeGreaterThanOrEqual(4);
  });
});
