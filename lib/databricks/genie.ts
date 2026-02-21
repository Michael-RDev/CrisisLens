export type GenieAnswer = {
  question: string;
  answer: string;
  source?: string;
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
    return {
      question,
      answer: `Genie mock response${scoped}. ${countryHint} Connect this call to Databricks Genie SQL warehouse and return cited metrics.`,
      source: "mock"
    };
  }
}

export function getGenieClient(): GenieClient {
  return new MockGenieClient();
}
