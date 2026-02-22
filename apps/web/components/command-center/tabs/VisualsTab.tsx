"use client";

import type { VisualMetricKey, VisualSeries } from "@/lib/services/databricks";

type VisualsTabProps = {
  metric: VisualMetricKey;
  series: VisualSeries | null;
  loading: boolean;
  error: string | null;
  allowComparativeFromQuery?: boolean;
  onMetricChange: (metric: VisualMetricKey) => void;
  onRetry: () => void;
};

const METRIC_OPTIONS: Array<{ key: VisualMetricKey; label: string }> = [
  { key: "coverage_trend", label: "Coverage over time" },
  { key: "funding_gap_per_person_trend", label: "Funding gap per person" },
  { key: "severity_trend", label: "Severity score trend" },
  { key: "oci_trend", label: "OCI trend" },
  { key: "people_in_need_trend", label: "People in need trend" }
];

function formatMetric(value: number, unit: string): string {
  if (!Number.isFinite(value)) return "0";
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
  }
  if (unit === "people") {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
  }
  return value.toFixed(2);
}

function linePath(values: number[], width: number, height: number, padding: number): string {
  if (!values.length) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1e-6);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (index * innerWidth) / Math.max(values.length - 1, 1);
      const y = padding + (1 - (value - min) / range) * innerHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function VisualsTab({
  metric,
  series,
  loading,
  error,
  allowComparativeFromQuery = false,
  onMetricChange,
  onRetry
}: VisualsTabProps) {
  const values = series?.values ?? [];
  const labels = series?.labels ?? [];
  const chartPath = linePath(values, 560, 220, 20);
  const latestValue = values.length ? values[values.length - 1] : 0;
  const hasComparativeData = values.length > 1 && labels.length > 1;
  const canRenderChart = hasComparativeData || allowComparativeFromQuery;

  return (
    <div id="tabpanel-visuals" role="tabpanel" aria-labelledby="tab-visuals" className="h-full space-y-3 overflow-y-auto pr-1">
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.08em] text-[#9fb9cb]" htmlFor="visual-metric-select">
          Metric
        </label>
        <select
          id="visual-metric-select"
          value={metric}
          onChange={(event) => onMetricChange(event.target.value as VisualMetricKey)}
          className="rounded-lg border border-[#355b75] bg-[#102738] px-2 py-2 text-xs text-[#e6f2fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9cdcff]"
        >
          {METRIC_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2 rounded-xl border border-[#2f5064] bg-[#0c1d2b] p-3">
          <div className="h-4 w-40 animate-pulse rounded bg-[#1b3a4e]" />
          <div className="h-52 animate-pulse rounded bg-[#17354a]" />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">
          <p className="m-0">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded border border-[#ba6f79] bg-[#5d2632] px-2 py-1 text-xs text-[#ffe8ee]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && series && values.length && canRenderChart ? (
        <>
          <div className="rounded-xl border border-[#315671] bg-[#10283a] p-3">
            <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9fb9cb]">Latest value</p>
            <p className="m-0 mt-1 text-base font-semibold text-[#ecf7ff]">{formatMetric(latestValue, series.unit)}</p>
            <p className="m-0 mt-1 text-[11px] text-[#b8cddd]">Updated {new Date(series.updatedAt).toLocaleTimeString()}</p>
          </div>

          <div className="rounded-xl border border-[#2f5064] bg-[#0c1d2b] p-2.5">
            <svg viewBox="0 0 560 220" className="h-[220px] w-full" role="img" aria-label="Trend chart">
              <defs>
                <linearGradient id="visualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7fd8ff" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="#7fd8ff" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <line x1="20" y1="200" x2="540" y2="200" stroke="#284b63" strokeWidth="1" />
              {chartPath ? <path d={`${chartPath} L 540 200 L 20 200 Z`} fill="url(#visualFill)" /> : null}
              {chartPath ? <path d={chartPath} fill="none" stroke="#7fd8ff" strokeWidth="2.2" /> : null}
              {values.map((value, index) => {
                const max = Math.max(...values);
                const min = Math.min(...values);
                const range = Math.max(max - min, 1e-6);
                const x = 20 + (index * 520) / Math.max(values.length - 1, 1);
                const y = 20 + (1 - (value - min) / range) * 180;
                return <circle key={`${labels[index]}-${value}`} cx={x} cy={y} r="2.6" fill="#95ddff" />;
              })}
              {labels.map((label, index) => {
                if (!(index === 0 || index === labels.length - 1 || index === Math.floor(labels.length / 2))) {
                  return null;
                }
                const x = 20 + (index * 520) / Math.max(labels.length - 1, 1);
                return (
                  <text key={label} x={x} y="214" textAnchor="middle" className="fill-[#b7cddd] text-[10px]">
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>
        </>
      ) : null}

      {!loading && !error && (!series || !values.length || !canRenderChart) ? (
        <div className="rounded-lg border border-[#2f526a] bg-[#102433] p-3 text-sm text-[#c4d8e7]">
          {!series || !values.length ? (
            <p className="m-0">No visual data returned for the selected metric.</p>
          ) : (
            <p className="m-0">
              Graphs are shown when comparative data is available (multi-period/multi-country) or when your
              insights query is comparative.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
