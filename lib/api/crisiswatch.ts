import { CountryMetrics } from "@/lib/types";

export type GlobeHeatmapRow = {
  country_iso3: string;
  fgi_score: number;
  cmi_score: number;
  cbpf_total_usd: number;
};

export type CountryDrilldown = {
  iso3: string;
  country: string;
  cluster_breakdown: Array<{
    cluster_name: string;
    bbr: number;
    bbr_z_score: number;
  }>;
  hrp_project_list: Array<{
    project_id: string;
    name: string;
    budget_usd: number;
    people_targeted: number;
    bbr_z_score: number;
  }>;
  metrics: CountryMetrics;
};

export type ProjectDetail = {
  project_id: string;
  project_name: string;
  metrics: {
    budget_usd: number;
    people_targeted: number;
    bbr: number;
    bbr_z_score: number;
  };
  comparable_projects: Array<{
    project_id: string;
    similarity_score: number;
    efficiency_delta_pct: number;
  }>;
};

export type GenieQueryResponse = {
  nl_query: string;
  answer: string;
  results: Array<Record<string, string | number | boolean | null>>;
  highlight_iso3: string[];
  source?: string;
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
