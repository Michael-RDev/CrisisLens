import type { LayerMode } from "@/lib/types";

export type MapLayerKey = "severity" | "funding_gap" | "coverage" | "oci";

export type LayerDatum = {
  iso3: string;
  value: number;
  intensity: number;
};

export type CountrySummary = {
  iso3: string;
  country: string;
  year: number;
  riskLabel: string;
  coveragePct: number | null;
  gapPerPersonUsd: number | null;
  peopleInNeed: number | null;
  ociScore: number | null;
  severityScore: number | null;
  fundingAdequacy: string;
  fundingGapUsd: number | null;
  fundingUsd: number | null;
  requirementsUsd: number | null;
  missingMetrics: string[];
};

export type InsightsResult = {
  headline: string;
  summary: string;
  keyPoints: string[];
  actions: string[];
  followups: string[];
  metricHighlights: Array<{ label: string; value: string }>;
  queryTable?: {
    columns: string[];
    rows: Array<Record<string, string | number | null>>;
    rowCount?: number;
    chart?: {
      label: string;
      valueLabel: string;
      points: Array<{ label: string; value: number }>;
    } | null;
  } | null;
  queryUsed?: string;
  sourceSql?: string | null;
  queriedByGenie?: boolean;
};

export type VisualMetricKey =
  | "coverage_trend"
  | "funding_gap_per_person_trend"
  | "severity_trend"
  | "oci_trend"
  | "people_in_need_trend";

export type VisualSeries = {
  iso3: string;
  metric: VisualMetricKey;
  labels: string[];
  values: number[];
  updatedAt: string;
  unit: string;
};

type JsonResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

const LAYER_CACHE_TTL_MS = 60_000;
const COUNTRY_CACHE_TTL_MS = 30_000;
const VISUAL_CACHE_TTL_MS = 30_000;

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const layerCache = new Map<MapLayerKey, CacheEntry<LayerDatum[]>>();
const countryCache = new Map<string, CacheEntry<CountrySummary>>();
const visualsCache = new Map<string, CacheEntry<VisualSeries>>();

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in (payload as Record<string, unknown>)
        ? String((payload as Record<string, unknown>).error ?? "Request failed.")
        : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)));
  return sorted[index];
}

function normalizeLayerRows(rows: Array<{ iso3: string; value: number }>): LayerDatum[] {
  const values = rows.map((row) => Number(row.value)).filter((value) => Number.isFinite(value));
  if (!values.length) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const floor = percentile(sorted, 0.05);
  const ceil = percentile(sorted, 0.95);
  const range = Math.max(ceil - floor, 1e-6);

  return rows
    .map((row) => {
      const value = Number(row.value);
      if (!Number.isFinite(value)) return null;
      const clamped = Math.min(Math.max(value, floor), ceil);
      const intensity = Math.min(1, Math.max(0, (clamped - floor) / range));
      return {
        iso3: row.iso3.trim().toUpperCase(),
        value,
        intensity
      } satisfies LayerDatum;
    })
    .filter((row): row is LayerDatum => row !== null && row.iso3.length === 3);
}

export function layerKeyToMode(key: MapLayerKey): LayerMode {
  if (key === "coverage") return "coverage";
  if (key === "funding_gap") return "fundingGap";
  if (key === "severity") return "severity";
  return "overlooked";
}

export function modeToLayerKey(mode: LayerMode): MapLayerKey {
  if (mode === "coverage") return "coverage";
  if (mode === "fundingGap") return "funding_gap";
  if (mode === "severity") return "severity";
  return "oci";
}

export function invalidateDatabricksCache(): void {
  layerCache.clear();
  countryCache.clear();
  visualsCache.clear();
}

export async function fetchLayerData(layer: MapLayerKey, force = false): Promise<LayerDatum[]> {
  const cached = layerCache.get(layer);
  if (!force && cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const response = await fetch(`/api/layers?layer=${encodeURIComponent(layer)}`, {
    method: "GET",
    cache: "no-store"
  });
  const parsed = await readJson<JsonResponse<Array<{ iso3: string; value: number }>>>(response);
  if (!parsed.ok) throw new Error(parsed.error);

  const normalized = normalizeLayerRows(parsed.data);
  layerCache.set(layer, {
    data: normalized,
    expiresAt: Date.now() + LAYER_CACHE_TTL_MS
  });

  return normalized;
}

export async function fetchCountrySummary(countryISO3: string, force = false): Promise<CountrySummary> {
  const iso3 = countryISO3.trim().toUpperCase();
  const cached = countryCache.get(iso3);
  if (!force && cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const response = await fetch(`/api/country?iso3=${encodeURIComponent(iso3)}&view=summary`, {
    method: "GET",
    cache: "no-store"
  });
  const parsed = await readJson<JsonResponse<CountrySummary>>(response);
  if (!parsed.ok) throw new Error(parsed.error);

  countryCache.set(iso3, {
    data: parsed.data,
    expiresAt: Date.now() + COUNTRY_CACHE_TTL_MS
  });

  return parsed.data;
}

export async function fetchCountryInsights(
  countryISO3: string,
  question: string,
  context?: { countryName?: string; year?: number }
): Promise<InsightsResult> {
  const response = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: "country",
      iso3: countryISO3.trim().toUpperCase(),
      question,
      countryName: context?.countryName,
      year: context?.year
    })
  });
  const parsed = await readJson<JsonResponse<InsightsResult>>(response);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.data;
}

export async function fetchGeneralInsights(question: string): Promise<InsightsResult> {
  const response = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: "general",
      question
    })
  });
  const parsed = await readJson<JsonResponse<InsightsResult>>(response);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.data;
}

// Backward-compatible alias for existing callers.
export const fetchInsights = fetchCountryInsights;

export async function fetchVisuals(
  countryISO3: string,
  metric: VisualMetricKey,
  timeRange?: string,
  force = false
): Promise<VisualSeries> {
  const iso3 = countryISO3.trim().toUpperCase();
  const key = `${iso3}:${metric}:${timeRange ?? "latest"}`;
  const cached = visualsCache.get(key);
  if (!force && cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const params = new URLSearchParams({
    iso3,
    metric
  });
  if (timeRange) params.set("timeRange", timeRange);

  const response = await fetch(`/api/visuals?${params.toString()}`, {
    method: "GET",
    cache: "no-store"
  });
  const parsed = await readJson<JsonResponse<VisualSeries>>(response);
  if (!parsed.ok) throw new Error(parsed.error);

  visualsCache.set(key, {
    data: parsed.data,
    expiresAt: Date.now() + VISUAL_CACHE_TTL_MS
  });

  return parsed.data;
}
