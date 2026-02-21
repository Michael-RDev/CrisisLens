export type GenieAnswer = {
  question: string;
  answer: string;
  source?: string;
  highlights?: string[];
  rows?: Array<{
    iso3: string;
    metric: string;
    score: number;
    rationale: string;
  }>;
};

export interface GenieClient {
  ask(question: string, iso3?: string): Promise<GenieAnswer>;
}

export class MockGenieClient implements GenieClient {
  async ask(question: string, iso3?: string): Promise<GenieAnswer> {
    const scoped = iso3 ? ` for ${iso3}` : "";
    const countryHint = iso3
      ? `Current country focus is ${iso3}.`
      : "No country filter applied, using global scope.";
    const primaryIso = iso3 ?? "SSD";
    const rows = [
      {
        iso3: primaryIso,
        metric: "coverage_mismatch_index",
        score: 74.2,
        rationale: "Coverage trails projected needs in multiple clusters"
      },
      {
        iso3: iso3 ? "SDN" : "YEM",
        metric: "funding_gap_pct",
        score: 67.1,
        rationale: "Funding trajectory below historical replenishment pattern"
      },
      {
        iso3: iso3 ? "ETH" : "AFG",
        metric: "in_need_rate",
        score: 61.4,
        rationale: "High in-need concentration with low response saturation"
      }
    ];

    return {
      question,
      answer: `Genie mock response${scoped}. ${countryHint} Connect this call to Databricks Genie SQL warehouse and return cited metrics.`,
      source: "mock",
      highlights: rows.map((row) => row.iso3),
      rows
    };
  }
}

export function getGenieClient(): GenieClient {
  return new MockGenieClient();
}
