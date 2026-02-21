import { CountryMetrics, RiskBand } from "@/lib/types";

export type DatabricksCountryState = {
  iso3: string;
  narrative?: string;
  riskBand?: RiskBand;
  agentTimestamp?: string;
  riskDrivers?: string[];
  recommendedActions?: string[];
  confidence?: number;
};

export interface DatabricksProvider {
  fetchCountryState(iso3: string): Promise<DatabricksCountryState | null>;
  fetchGlobalOverrides(): Promise<Record<string, Partial<CountryMetrics>>>;
}

export class MockDatabricksProvider implements DatabricksProvider {
  async fetchCountryState(iso3: string): Promise<DatabricksCountryState | null> {
    const riskOrder: RiskBand[] = ["low", "moderate", "high", "critical"];
    const riskBand = riskOrder[iso3.charCodeAt(0) % riskOrder.length];
    const seed = iso3.charCodeAt(0) + iso3.charCodeAt(1) + iso3.charCodeAt(2);
    const confidence = 0.66 + (seed % 19) / 100;
    return {
      iso3,
      narrative: `Agent mock for ${iso3}: monitor displacement pressure, funding gaps, and response throughput for the next 14 days.`,
      riskBand,
      agentTimestamp: new Date().toISOString(),
      confidence: Number(Math.min(confidence, 0.93).toFixed(2)),
      riskDrivers: [
        "Funding gap trend accelerating week-over-week",
        "Coverage mismatch concentrated in high-severity districts",
        "Cluster delivery ratio volatility above baseline"
      ],
      recommendedActions: [
        "Reprioritize pooled funds toward top 2 outlier clusters",
        "Trigger weekly OCI threshold alert at +2.5 delta",
        "Run benchmark comparison against nearest peer countries"
      ]
    };
  }

  async fetchGlobalOverrides(): Promise<Record<string, Partial<CountryMetrics>>> {
    return {};
  }
}

export function getDatabricksProvider(): DatabricksProvider {
  return new MockDatabricksProvider();
}
