export type CountryMetrics = {
  iso3: string;
  country: string;
  population: number;
  inNeed: number;
  targeted: number;
  affected: number;
  reached: number;
  fundingRequired: number;
  fundingReceived: number;
  percentFunded: number;
  revisedPlanRequirements: number;
  latestFundingYear: number;
  severityScore: number;
};

export type RiskBand = "low" | "moderate" | "high" | "critical";

export type DataSnapshot = {
  generatedAt: string;
  sourceFiles: string[];
  recordCount: number;
};

export type GlobeSelection = {
  iso3: string;
  country: string;
};

export type LayerMode = "severity" | "inNeedRate" | "fundingGap" | "coverage";
