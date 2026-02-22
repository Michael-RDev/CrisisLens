import { CountryMetrics } from "@/lib/types";

export type GlobeHeatmapRow = {
  country_iso3: string;
  fgi_score: number;
  cmi_score: number;
  oci_score: number;
  cbpf_total_usd: number;
};

export type CountryDrilldown = {
  iso3: string;
  country: string;
  oci: {
    severityComponent: number;
    inNeedRateComponent: number;
    fundingGapComponent: number;
    coverageMismatchComponent: number;
    totalScore: number;
  };
  cluster_breakdown: Array<{
    cluster_name: string;
    bbr: number;
    bbr_z_score: number;
    budget_usd: number;
    people_targeted: number;
  }>;
  hrp_project_list: Array<{
    project_id: string;
    name: string;
    cluster_name: string;
    budget_usd: number;
    people_targeted: number;
    bbr: number;
    bbr_z_score: number;
    outlier_flag: "low" | "high" | "none";
  }>;
  outlier_projects: Array<{
    project_id: string;
    name: string;
    cluster_name: string;
    budget_usd: number;
    people_targeted: number;
    bbr: number;
    bbr_z_score: number;
    outlier_flag: "low" | "high" | "none";
  }>;
  metrics: CountryMetrics;
};

export type ProjectDetail = {
  project_id: string;
  project_name: string;
  metrics: {
    budget_usd: number;
    funding_usd: number;
    funding_pct: number;
    people_targeted: number;
    bbr: number;
    bbr_z_score: number;
    cluster_name: string;
    outlier_flag: "low" | "high" | "none";
  };
  comparable_projects: Array<{
    project_id: string;
    similarity_score: number;
    efficiency_delta_pct: number;
    rationale: string;
  }>;
};

export type AnalyticsOverviewResponse = {
  generated_at: string;
  formula: {
    severity_component_pct: number;
    in_need_rate_component_pct: number;
    funding_gap_component_pct: number;
    coverage_mismatch_component_pct: number;
  };
  top_overlooked: Array<{
    rank: number;
    iso3: string;
    country: string;
    oci_score: number;
    severity_score: number;
    in_need_pct: number;
    funding_gap_pct: number;
    coverage_pct: number;
  }>;
};

export type SimulationResponse = {
  iso3: string;
  allocation_usd: number;
  ml_context: {
    source_path: string;
    projection_points: number;
    uses_neglect_flag: boolean;
  };
  base: {
    rank: number;
    oci: number;
    funding_received: number;
    percent_funded: number;
  };
  scenario: {
    rank: number;
    oci: number;
    funding_received: number;
    percent_funded: number;
    projected_neglect: number;
  };
  rank_delta: number;
  oci_delta: number;
  overall_score_delta: number;
  top_overlooked_after: Array<{
    rank: number;
    iso3: string;
    country: string;
    oci_score: number;
  }>;
  leaderboard_changes: Array<{
    rank_before: number;
    rank_after: number;
    rank_delta: number;
    iso3: string;
    country: string;
    oci_before: number;
    oci_after: number;
    oci_delta: number;
  }>;
  country_impacts: Array<{
    iso3: string;
    country: string;
    rank_before: number;
    rank_after: number;
    rank_delta: number;
    overall_score_delta: number;
    projected_neglect_delta: number;
    direction: "up" | "down" | "flat";
    relation: "still_ahead" | "new_ahead" | "overtaken" | "behind_buffer" | "shifted";
  }>;
  impact_arrows: Array<{
    from_iso3: string;
    to_iso3: string;
    country: string;
    direction: "pressure" | "relief" | "neutral";
    relation: "still_ahead" | "new_ahead" | "overtaken" | "behind_buffer" | "shifted";
    rank_delta: number;
    overall_score_delta: number;
    projected_neglect_delta: number;
    magnitude: number;
  }>;
  quarters: Array<{
    quarter_label: string;
    quarter_index: number;
    months_ahead: number;
    selected_country: {
      rank: number;
      oci: number;
      overall_score_delta: number;
      funding_received: number;
      percent_funded: number;
      projected_neglect: number;
      neglect_flag_pred: boolean | null;
    };
    top_overlooked: Array<{
      rank: number;
      iso3: string;
      country: string;
      oci_score: number;
    }>;
    metrics_overrides: Array<{
      iso3: string;
      country: string;
      overlooked_score: number;
      severity_score: number;
      funding_received: number;
      percent_funded: number;
      projected_neglect: number;
    }>;
  }>;
};

export type GenieQueryResponse = {
  nl_query: string;
  answer: string;
  source?: string;
  results: Array<{
    iso3: string;
    metric: string;
    score: number;
    rationale?: string;
  }>;
  highlight_iso3: string[];
};

export type GlobeEvent =
  | {
      type: "anomaly";
      iso3: string;
      severity: number;
      message: string;
    }
  | {
      type: "highlight";
      iso3: string[];
      reason: string;
    };

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchGlobeHeatmap(): Promise<GlobeHeatmapRow[]> {
  const response = await fetch("/api/globe/heatmap", { method: "GET" });
  return parseJson<GlobeHeatmapRow[]>(response);
}

export async function fetchCountryDrilldown(iso3: string): Promise<CountryDrilldown> {
  const response = await fetch(`/api/country/${iso3}`, { method: "GET" });
  return parseJson<CountryDrilldown>(response);
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetail> {
  const response = await fetch(`/api/project/${projectId}`, { method: "GET" });
  return parseJson<ProjectDetail>(response);
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverviewResponse> {
  const response = await fetch("/api/analytics/overview", { method: "GET" });
  return parseJson<AnalyticsOverviewResponse>(response);
}

export async function simulateFundingScenario(payload: {
  iso3: string;
  allocation_usd: number;
}): Promise<SimulationResponse> {
  const response = await fetch("/api/analytics/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson<SimulationResponse>(response);
}

export async function queryGenie(payload: {
  nl_query: string;
  iso3?: string;
}): Promise<GenieQueryResponse> {
  const response = await fetch("/api/genie/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson<GenieQueryResponse>(response);
}

export function subscribeToGlobeEvents(
  wsUrl: string,
  onEvent: (event: GlobeEvent) => void
): () => void {
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (message) => {
    try {
      const data = JSON.parse(message.data as string) as GlobeEvent;
      onEvent(data);
    } catch {
      // Ignore malformed events.
    }
  };
  return () => ws.close();
}
