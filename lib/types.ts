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
  overlookedScore?: number;
};

export type RiskBand = "low" | "moderate" | "high" | "critical";

export type DataSnapshot = {
  generatedAt: string;
  sourceFiles: string[];
  recordCount: number;
  projectRecordCount?: number;
};

export type GlobeSelection = {
  iso3: string;
  country: string;
};

export type LayerMode = "severity" | "inNeedRate" | "fundingGap" | "coverage" | "overlooked";

export type OciComponents = {
  severityComponent: number;
  inNeedRateComponent: number;
  fundingGapComponent: number;
  coverageMismatchComponent: number;
  totalScore: number;
};

export type ProjectProfile = {
  project_id: string;
  name: string;
  iso3: string;
  country: string;
  year: number;
  cluster_name: string;
  budget_usd: number;
  funding_usd: number;
  funding_pct: number;
  people_targeted: number;
  people_in_need: number;
  population: number;
  bbr: number;
  bbr_z_score: number;
  outlier_flag: "low" | "high" | "none";
  source_quality: "exact_cluster_match" | "country_fallback";
};

export type ComparableProject = {
  project_id: string;
  similarity_score: number;
  efficiency_delta_pct: number;
  rationale: string;
};
