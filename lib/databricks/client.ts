import { CountryMetrics, RiskBand } from "@/lib/types";

export type DatabricksCountryState = {
  iso3: string;
  narrative?: string;
  riskBand?: RiskBand;
  agentTimestamp?: string;
};

export interface DatabricksProvider {
  fetchCountryState(iso3: string): Promise<DatabricksCountryState | null>;
  fetchGlobalOverrides(): Promise<Record<string, Partial<CountryMetrics>>>;
}

export class MockDatabricksProvider implements DatabricksProvider {
  async fetchCountryState(iso3: string): Promise<DatabricksCountryState | null> {
    const riskOrder: RiskBand[] = ["low", "moderate", "high", "critical"];
    const riskBand = riskOrder[iso3.charCodeAt(0) % riskOrder.length];
    return {
      iso3,
      narrative: `Agent mock for ${iso3}: monitor displacement pressure, funding gaps, and response throughput for the next 14 days.`,
      riskBand,
      agentTimestamp: new Date().toISOString()
    };
  }

  async fetchGlobalOverrides(): Promise<Record<string, Partial<CountryMetrics>>> {
    return {};
  }
}

export function getDatabricksProvider(): DatabricksProvider {
  return new MockDatabricksProvider();
}
