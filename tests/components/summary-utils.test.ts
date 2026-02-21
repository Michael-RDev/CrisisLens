import { describe, expect, it } from "vitest";
import { computeGlobalSummary, formatCompact } from "@/components/summary-utils";
import { CountryMetrics } from "@/lib/types";

const sample: CountryMetrics[] = [
  {
    iso3: "AAA",
    country: "A",
    population: 100,
    inNeed: 25,
    targeted: 20,
    affected: 40,
    reached: 10,
    fundingRequired: 1000,
    fundingReceived: 400,
    percentFunded: 40,
    revisedPlanRequirements: 1100,
    latestFundingYear: 2026,
    severityScore: 55
  },
  {
    iso3: "BBB",
    country: "B",
    population: 900,
    inNeed: 200,
    targeted: 120,
    affected: 250,
    reached: 100,
    fundingRequired: 3000,
    fundingReceived: 1000,
    percentFunded: 33.3,
    revisedPlanRequirements: 3200,
    latestFundingYear: 2026,
    severityScore: 72
  }
];

describe("summary utils", () => {
  it("aggregates global summary", () => {
    const summary = computeGlobalSummary(sample);
    expect(summary.population).toBe(1000);
    expect(summary.inNeed).toBe(225);
    expect(summary.fundingRequired).toBe(4000);
    expect(summary.fundingReceived).toBe(1400);
    expect(summary.fundingGap).toBe(2600);
    expect(summary.fundedPct).toBe(35);
  });

  it("formats compact safely", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(-4)).toBe("0");
    expect(formatCompact(1200)).toMatch(/1\.2K|1\.2k/);
  });
});
