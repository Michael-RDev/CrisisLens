import { describe, expect, it } from "vitest";
import {
  annotateProjectOutliers,
  comparableProjectsFor,
  computeOciComponents,
  rankOverlooked,
  simulateFundingAllocation
} from "@/lib/analytics";
import { CountryMetrics, ProjectProfile } from "@/lib/types";

const baseMetrics: CountryMetrics[] = [
  {
    iso3: "AAA",
    country: "Aland",
    population: 1_000_000,
    inNeed: 500_000,
    targeted: 300_000,
    affected: 100_000,
    reached: 80_000,
    fundingRequired: 100_000_000,
    fundingReceived: 20_000_000,
    percentFunded: 20,
    revisedPlanRequirements: 120_000_000,
    latestFundingYear: 2026,
    severityScore: 90
  },
  {
    iso3: "BBB",
    country: "Borland",
    population: 2_000_000,
    inNeed: 300_000,
    targeted: 200_000,
    affected: 80_000,
    reached: 180_000,
    fundingRequired: 90_000_000,
    fundingReceived: 80_000_000,
    percentFunded: 88.9,
    revisedPlanRequirements: 95_000_000,
    latestFundingYear: 2026,
    severityScore: 55
  }
];

const baseProjects: ProjectProfile[] = [
  {
    project_id: "P1",
    name: "P1",
    iso3: "AAA",
    country: "Aland",
    year: 2026,
    cluster_name: "Health",
    budget_usd: 10_000_000,
    funding_usd: 2_000_000,
    funding_pct: 20,
    people_targeted: 200_000,
    people_in_need: 300_000,
    population: 1_000_000,
    bbr: 0.02,
    bbr_z_score: 0,
    outlier_flag: "none",
    source_quality: "exact_cluster_match"
  },
  {
    project_id: "P2",
    name: "P2",
    iso3: "AAA",
    country: "Aland",
    year: 2026,
    cluster_name: "Health",
    budget_usd: 8_000_000,
    funding_usd: 3_000_000,
    funding_pct: 37.5,
    people_targeted: 40_000,
    people_in_need: 250_000,
    population: 1_000_000,
    bbr: 0.005,
    bbr_z_score: 0,
    outlier_flag: "none",
    source_quality: "exact_cluster_match"
  },
  {
    project_id: "P3",
    name: "P3",
    iso3: "BBB",
    country: "Borland",
    year: 2026,
    cluster_name: "Health",
    budget_usd: 9_500_000,
    funding_usd: 9_000_000,
    funding_pct: 94.7,
    people_targeted: 240_000,
    people_in_need: 260_000,
    population: 2_000_000,
    bbr: 0.0252,
    bbr_z_score: 0,
    outlier_flag: "none",
    source_quality: "exact_cluster_match"
  }
];

describe("analytics", () => {
  it("computes OCI and ranks overlooked crises", () => {
    const ranked = rankOverlooked(baseMetrics);
    expect(ranked[0].iso3).toBe("AAA");
    const components = computeOciComponents(ranked[0]);
    expect(components.totalScore).toBeGreaterThan(70);
  });

  it("improves rank after simulated funding", () => {
    const simulated = simulateFundingAllocation(baseMetrics, "AAA", 60_000_000);
    const rankedAfter = rankOverlooked(simulated);
    expect(rankedAfter[0].iso3).toBe("AAA");
    expect((rankedAfter[0].overlookedScore ?? 0)).toBeLessThan((rankOverlooked(baseMetrics)[0].overlookedScore ?? 100));
  });

  it("flags project outliers and returns comparables", () => {
    const annotated = annotateProjectOutliers(baseProjects);
    expect(annotated.some((row) => row.outlier_flag !== "none")).toBe(true);
    const comparables = comparableProjectsFor(annotated[0], annotated, 2);
    expect(comparables).toHaveLength(2);
    expect(comparables[0].similarity_score).toBeGreaterThan(0);
  });
});

