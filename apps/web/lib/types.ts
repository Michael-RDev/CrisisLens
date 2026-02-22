export type FutureProjection = {
  step: string;
  monthsAhead: number;
  horizonModel: string;
  /** PyTorch MLP binary classification: true = model predicts neglected (>=65) at this horizon */
  neglectFlagPred?: boolean;
  /** Mean predictive probability from MC-dropout passes. */
  neglectFlagProb?: number;
  /** Predictive std-dev from MC-dropout passes (epistemic uncertainty proxy). */
  neglectFlagUncertainty?: number;
  scores: {
    neglectScore?: number;
    ensembleScore?: number;
    lgbm?: number;
    rf?: number;
    xgb?: number;
    gbr?: number;
  };
};

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
  // ML model outputs from gold_country_scores.json
  ensembleScore?: number;
  neglectScore?: number;
  neglectFlag?: boolean;
  modelScores?: {
    lgbm?: number;
    rf?: number;
    xgb?: number;
    gbr?: number;
    stacking?: number;
    ensemble?: number;
  };
  futureProjections?: FutureProjection[];
  // EDA dataset-adjustment signals
  donorDiversityScore?: number;
  internalFundingUsd?: number;
  globalClusterGapPct?: number;
  // Additional metrics
  fgiScore?: number;
  cmiScore?: number;
  cbpfTotalUsd?: number;
  cbpfShare?: number;
  pinPctPop?: number;
  anomalySeverity?: string;
  modelAgreement?: number;
  peerIso3?: string[];
  fundingTrend?: Array<{ year: number; req_usd: number; funded_usd: number }>;
  reqUsd?: number;
  fundedUsd?: number;
  pin?: number;
  planName?: string;
  latestYear?: number;
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
