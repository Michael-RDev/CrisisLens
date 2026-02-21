import { describe, expect, it } from "vitest";
import { clampToPercent, computeDerivedMetrics, getLayerValue, riskBandFromScore } from "@/lib/metrics";
import { CountryMetrics } from "@/lib/types";

const row: CountryMetrics = {
  iso3: "ETH",
  country: "Ethiopia",
  population: 1000,
  inNeed: 400,
  targeted: 300,
  affected: 420,
  reached: 120,
  fundingRequired: 100000,
  fundingReceived: 35000,
  percentFunded: 35,
  revisedPlanRequirements: 120000,
  latestFundingYear: 2026,
  severityScore: 78
};

describe("metrics helpers", () => {
  it("clamps percent values", () => {
    expect(clampToPercent(120)).toBe(100);
    expect(clampToPercent(-10)).toBe(0);
    expect(clampToPercent(45.5)).toBe(45.5);
  });

  it("computes derived values", () => {
    const derived = computeDerivedMetrics(row);
    expect(derived.inNeedPct).toBe(40);
    expect(derived.coveragePct).toBe(30);
    expect(derived.fundingGap).toBe(65000);
    expect(derived.fundingGapPct).toBe(65);
  });

  it("returns layer value by mode", () => {
    expect(getLayerValue(row, "severity")).toBe(78);
    expect(getLayerValue(row, "inNeedRate")).toBe(40);
    expect(getLayerValue(row, "fundingGap")).toBe(65);
    expect(getLayerValue(row, "coverage")).toBe(30);
  });

  it("maps risk bands", () => {
    expect(riskBandFromScore(85)).toBe("critical");
    expect(riskBandFromScore(61)).toBe("high");
    expect(riskBandFromScore(45)).toBe("moderate");
    expect(riskBandFromScore(5)).toBe("low");
  });
});
