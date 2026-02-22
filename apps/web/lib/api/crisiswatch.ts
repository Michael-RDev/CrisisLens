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
  };
  rank_delta: number;
  oci_delta: number;
  top_overlooked_after: Array<{
    rank: number;
    iso3: string;
    country: string;
    oci_score: number;
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

export type InsightMetricsResponse = {
  countryCode: string;
  countryName: string;
  cards: {
    pin: number;
    funding: number;
    pinFundingRatio: number | null;
    rank: number;
  };
  details: {
    percentFunded: number;
    fundingRequired: number;
    inNeedRate: number;
    fundingGapPct: number;
    coveragePct: number;
    severityScore: number;
    latestFundingYear: number;
  };
  chart: Array<{ label: string; value: number }>;
};

export type GenieSummaryResponse = {
  status: string;
  conversationId: string;
  messageId: string;
  summaryText: string;
  keyDrivers: string[];
  outliers: string[];
  sql?: string | null;
  topList?: Array<{ label: string; value: string; note?: string }>;
  attachments?: Array<{ attachment_id: string; [key: string]: unknown }>;
  rows?: Array<Record<string, unknown>>;
};

export type GeoMetrics = {
  iso3: string;
  country: string;
  year: number;
  people_in_need: number;
  people_targeted: number;
  funding_usd: number;
  requirements_usd: number;
  funding_gap_usd: number;
  funding_coverage_ratio: number;
  funding_gap_per_person: number;
  coverage_pct: number;
};

export type GeoInsight = {
  headline: string;
  summary: string;
  flags: string[];
  followups: string[];
  source?: "ai" | "fallback";
  askedQuestion?: string | null;
};

export type GeoInsightResponse = {
  ok: true;
  data: {
    metrics: GeoMetrics;
    insight: GeoInsight;
  };
};

export type GeoApiError = {
  ok: false;
  error: string;
};

export type GeoStrategicQueryResult = {
  intent: "compare" | "funding_up" | "funding_cut" | "solutions" | "general";
  headline: string;
  answer: string;
  keyPoints: string[];
  recommendations: string[];
  followups: string[];
  rows: Array<{
    iso3: string;
    country: string;
    year: number;
    funding_coverage_ratio: number;
    coverage_pct: number;
    funding_gap_usd: number;
    funding_gap_per_person: number;
    people_in_need: number;
  }>;
  askedQuestion: string;
};

export type GenieSessionResponse = {
  conversationId: string;
};

export type GenieAskResponse =
  | {
      ok: true;
      conversationId: string;
      messageId: string;
      summaryText: string;
      formatted?: {
        headline: string;
        summary: string;
        keyPoints: string[];
        actions: string[];
        followups: string[];
        metricHighlights?: Array<{ label: string; value: string }>;
      };
      sql?: string | null;
      queryResult?: {
        columns: string[];
        rows: unknown[][];
        rowCount?: number;
      } | null;
    }
  | {
      ok: false;
      code: "GENIE_TIMEOUT" | "GENIE_FAILED" | "AUTH" | "BAD_REQUEST";
      message: string;
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
    let detail = "";
    try {
      const payload = (await response.json()) as {
        error?: string;
        details?: string;
        message?: string;
        code?: string;
      };
      const parts = [payload.error, payload.message, payload.details, payload.code]
        .filter((item): item is string => Boolean(item));
      detail = parts.join(" | ");
    } catch {
      detail = "";
    }
    throw new Error(detail || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchGlobeHeatmap(): Promise<GlobeHeatmapRow[]> {
  const response = await fetch("/api/globe-heatmap", { method: "GET" });
  return parseJson<GlobeHeatmapRow[]>(response);
}

export async function fetchCountryDrilldown(iso3: string): Promise<CountryDrilldown> {
  const response = await fetch(`/api/country?iso3=${encodeURIComponent(iso3)}`, { method: "GET" });
  return parseJson<CountryDrilldown>(response);
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetail> {
  const response = await fetch(`/api/project?projectId=${encodeURIComponent(projectId)}`, { method: "GET" });
  return parseJson<ProjectDetail>(response);
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverviewResponse> {
  const response = await fetch("/api/analytics-overview", { method: "GET" });
  return parseJson<AnalyticsOverviewResponse>(response);
}

export async function simulateFundingScenario(payload: {
  iso3: string;
  allocation_usd: number;
}): Promise<SimulationResponse> {
  const response = await fetch("/api/analytics-simulate", {
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
  const response = await fetch("/api/genie-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson<GenieQueryResponse>(response);
}

export async function ensureGenieSession(): Promise<{ conversationId: string }> {
  const response = await fetch("/api/genie-session", {
    method: "POST"
  });
  return parseJson<{ conversationId: string }>(response);
}

export async function ensureGenieConversation(): Promise<GenieSessionResponse> {
  const response = await fetch("/api/genie/session", { method: "POST" });
  return parseJson<GenieSessionResponse>(response);
}

export async function askGenieCountryInsight(payload: {
  conversationId: string;
  iso3: string;
  countryName?: string;
  intent?: "summary" | "overfunded" | "top10" | "comparison" | "general";
  question?: string;
}): Promise<Exclude<GenieAskResponse, { ok: false }>> {
  const response = await fetch("/api/genie/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const parsed = await parseJson<GenieAskResponse>(response);
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }
  return parsed;
}

export async function fetchCountryInsightMetrics(countryCode: string): Promise<InsightMetricsResponse> {
  const response = await fetch("/api/country-metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ countryCode })
  });
  return parseJson<InsightMetricsResponse>(response);
}

export async function fetchGenieSummary(payload: {
  countryCode: string;
  countryName?: string;
  conversationId?: string;
  followUpQuestion?: string;
}): Promise<GenieSummaryResponse> {
  const response = await fetch("/api/genie-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson<GenieSummaryResponse>(response);
}

export async function fetchGeoInsight(payload: {
  iso3?: string;
  country?: string;
}): Promise<GeoInsightResponse["data"]> {
  const params = new URLSearchParams();
  if (payload.iso3) params.set("iso3", payload.iso3);
  if (payload.country) params.set("country", payload.country);

  const response = await fetch(`/api/geo/insight?${params.toString()}`, {
    method: "GET"
  });

  const parsed = await parseJson<GeoInsightResponse | GeoApiError>(response);
  if (!parsed || !("ok" in parsed) || parsed.ok !== true) {
    throw new Error("Geo insight response was invalid.");
  }
  return parsed.data;
}

export async function fetchGeoSummary(payload: {
  metrics: GeoMetrics;
  question?: string;
}): Promise<GeoInsight> {
  const response = await fetch("/api/geo/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const parsed = await parseJson<
    | {
        ok: true;
        data: GeoInsight;
      }
    | GeoApiError
  >(response);

  if (!parsed || !("ok" in parsed) || parsed.ok !== true) {
    throw new Error("Geo summary response was invalid.");
  }

  return parsed.data;
}

export async function runGeoStrategicQuery(question: string): Promise<GeoStrategicQueryResult> {
  const response = await fetch("/api/geo/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });

  const parsed = await parseJson<
    | {
        ok: true;
        data: GeoStrategicQueryResult;
      }
    | GeoApiError
  >(response);

  if (!parsed || !("ok" in parsed) || parsed.ok !== true) {
    throw new Error("Geo strategic query response was invalid.");
  }

  return parsed.data;
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
