import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SimulationResponse } from "@/lib/api/crisiswatch";
import { PanelLoading } from "@/components/dashboard/PanelLoading";
import { countryByIso3 } from "@/lib/countries";
import { buildModelOutlook, buildSimulationHeatmapRows, type HeatmapMetricKey } from "@/lib/simulation-viz";

type SimulationPanelProps = {
  selectedIso3: string | null;
  allocationUsd: string;
  simulationLoading: boolean;
  simulation: SimulationResponse | null;
  showImpactArrows: boolean;
  onAllocationChange: (value: string) => void;
  onAllocationAdjust: (deltaUsd: number) => void;
  onShowImpactArrowsChange: (value: boolean) => void;
  onSimulate: () => void;
};

const QUICK_ALLOCATION_STEPS = [
  { label: "+1m", usd: 1_000_000 },
  { label: "+10m", usd: 10_000_000 },
  { label: "+100m", usd: 100_000_000 }
] as const;

const TREND_CHART = {
  width: 620,
  height: 260,
  padding: { top: 16, right: 18, bottom: 44, left: 50 }
} as const;

const DELTA_CHART = {
  width: 620,
  height: 220,
  padding: { top: 16, right: 18, bottom: 44, left: 50 }
} as const;

type ChartPoint = {
  x: number;
  y: number;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatUsdCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatSigned(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}`;
}

function chartInnerWidth(frame: { width: number; padding: { left: number; right: number } }): number {
  return frame.width - frame.padding.left - frame.padding.right;
}

function chartInnerHeight(frame: { height: number; padding: { top: number; bottom: number } }): number {
  return frame.height - frame.padding.top - frame.padding.bottom;
}

function normalizeRange(minValue: number, maxValue: number): { min: number; max: number } {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return { min: 0, max: 1 };
  }
  if (Math.abs(maxValue - minValue) < 1e-6) {
    const pad = Math.max(Math.abs(maxValue) * 0.1, 1);
    return { min: minValue - pad, max: maxValue + pad };
  }
  return { min: minValue, max: maxValue };
}

function buildLinearTicks(minValue: number, maxValue: number, count = 5): number[] {
  const { min, max } = normalizeRange(minValue, maxValue);
  const step = (max - min) / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, index) => Number((min + step * index).toFixed(2)));
}

function scaleX(
  index: number,
  pointCount: number,
  frame: { width: number; padding: { left: number; right: number } }
): number {
  const denominator = Math.max(pointCount - 1, 1);
  return frame.padding.left + (index / denominator) * chartInnerWidth(frame);
}

function scaleY(
  value: number,
  minValue: number,
  maxValue: number,
  frame: { height: number; padding: { top: number; bottom: number } }
): number {
  const { min, max } = normalizeRange(minValue, maxValue);
  return frame.padding.top + ((max - value) / (max - min)) * chartInnerHeight(frame);
}

function buildSeriesPoints(
  values: number[],
  minValue: number,
  maxValue: number,
  frame: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
  }
): ChartPoint[] {
  return values.map((value, index) => ({
    x: scaleX(index, values.length, frame),
    y: scaleY(value, minValue, maxValue, frame)
  }));
}

function buildPolylinePath(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function buildAreaPath(points: ChartPoint[], baselineY: number): string {
  if (points.length === 0) return "";
  const line = buildPolylinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "";
  return `${line} L${last.x.toFixed(1)} ${baselineY.toFixed(1)} L${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

function toggleClass(isActive: boolean): string {
  return isActive
    ? "border-[var(--dbx-accent)] bg-[var(--dbx-tab-active-bg)] text-[var(--dbx-tab-active-text)]"
    : "border-[var(--dbx-tab-border)] bg-[var(--dbx-tab-bg)] text-[var(--dbx-tab-text)]";
}

function formatHeatmapMetricValue(metricKey: HeatmapMetricKey, value: number): string {
  if (metricKey === "funding_received") return formatUsdCompact(value);
  if (metricKey === "percent_funded") return `${value.toFixed(1)}%`;
  if (metricKey === "rank") return `#${Math.round(value)}`;
  return value.toFixed(2);
}

function heatmapCellStyle(status: "improve" | "worsen" | "flat", intensity: number): { backgroundColor: string } {
  const bounded = Math.max(0.2, Math.min(1, intensity));
  if (status === "improve") {
    return { backgroundColor: `rgba(34, 197, 94, ${0.14 + bounded * 0.52})` };
  }
  if (status === "worsen") {
    return { backgroundColor: `rgba(239, 68, 68, ${0.14 + bounded * 0.52})` };
  }
  return { backgroundColor: `rgba(148, 163, 184, ${0.08 + bounded * 0.24})` };
}

export function SimulationPanel({
  selectedIso3,
  allocationUsd,
  simulationLoading,
  simulation,
  showImpactArrows,
  onAllocationChange,
  onAllocationAdjust,
  onShowImpactArrowsChange,
  onSimulate
}: SimulationPanelProps) {
  const selectedCountryName = selectedIso3 ? countryByIso3.get(selectedIso3)?.name ?? selectedIso3 : null;
  const [showQuarterlyChart, setShowQuarterlyChart] = useState(true);
  const [showLeaderboardGraph, setShowLeaderboardGraph] = useState(true);
  const [showImpactTable, setShowImpactTable] = useState(true);
  const [showMetricsHeatmap, setShowMetricsHeatmap] = useState(true);
  const [showModelPredictions, setShowModelPredictions] = useState(true);

  const quarters = useMemo(() => simulation?.quarters ?? [], [simulation]);
  const quarterLabels = quarters.map((quarter) => quarter.quarter_label);
  const ociSeries = quarters.map((quarter) => quarter.selected_country.oci);
  const neglectSeries = quarters.map((quarter) => quarter.selected_country.projected_neglect);
  const fundingSeries = quarters.map((quarter) => quarter.selected_country.funding_received);
  const trendMinValue = Math.min(...ociSeries, ...neglectSeries, 0);
  const trendMaxValue = Math.max(...ociSeries, ...neglectSeries, 100);
  const trendTicks = useMemo(() => buildLinearTicks(trendMinValue, trendMaxValue, 5), [trendMinValue, trendMaxValue]);
  const ociPoints = useMemo(
    () => buildSeriesPoints(ociSeries, trendMinValue, trendMaxValue, TREND_CHART),
    [ociSeries, trendMinValue, trendMaxValue]
  );
  const neglectPoints = useMemo(
    () => buildSeriesPoints(neglectSeries, trendMinValue, trendMaxValue, TREND_CHART),
    [neglectSeries, trendMinValue, trendMaxValue]
  );
  const ociPath = useMemo(() => buildPolylinePath(ociPoints), [ociPoints]);
  const neglectPath = useMemo(() => buildPolylinePath(neglectPoints), [neglectPoints]);
  const trendBaselineY = TREND_CHART.height - TREND_CHART.padding.bottom;
  const ociAreaPath = useMemo(() => buildAreaPath(ociPoints, trendBaselineY), [ociPoints, trendBaselineY]);
  const neglectAreaPath = useMemo(
    () => buildAreaPath(neglectPoints, trendBaselineY),
    [neglectPoints, trendBaselineY]
  );
  const fundingMax = Math.max(...fundingSeries, 1);
  const leaderboardRows = simulation?.leaderboard_changes.slice(0, 10) ?? [];
  const leaderboardMax = Math.max(...leaderboardRows.map((row) => Math.abs(row.oci_delta)), 0.5);
  const heatmapRows = useMemo(() => buildSimulationHeatmapRows(quarters), [quarters]);
  const modelOutlook = useMemo(() => buildModelOutlook(quarters), [quarters]);
  const neglectDeltaRows = useMemo(
    () =>
      quarters.map((quarter, index) => {
        const previous = quarters[index - 1]?.selected_country.projected_neglect ?? quarter.selected_country.projected_neglect;
        const delta = Number((quarter.selected_country.projected_neglect - previous).toFixed(2));
        return {
          quarterLabel: quarter.quarter_label,
          projectedNeglect: quarter.selected_country.projected_neglect,
          delta
        };
      }),
    [quarters]
  );
  const neglectDeltaMax = Math.max(...neglectDeltaRows.map((row) => Math.abs(row.delta)), 0.5);
  const deltaTicks = useMemo(() => {
    const max = Number(neglectDeltaMax.toFixed(2));
    return [-max, -max / 2, 0, max / 2, max].map((value) => Number(value.toFixed(2)));
  }, [neglectDeltaMax]);
  const deltaZeroY = scaleY(0, -neglectDeltaMax, neglectDeltaMax, DELTA_CHART);
  const q1 = quarters[0]?.selected_country ?? null;
  const q8 = quarters[quarters.length - 1]?.selected_country ?? null;

  return (
    <motion.article
      className="min-w-0 overflow-x-auto overflow-y-visible rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
        Scenario Modeling
      </p>
      <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">Funding What-if Simulator</h2>
      <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
        Test how adding pooled-fund allocation changes country OCI rank, neglected-score projection, and the global leaderboard.
      </p>

      <div className="mt-3 grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded-[10px] border border-[var(--dbx-input-border)] bg-[var(--dbx-input-bg)] px-3 py-2 text-sm text-[var(--dbx-text)]"
            value={allocationUsd}
            onChange={(event) => onAllocationChange(event.target.value)}
            placeholder="5000000"
            inputMode="numeric"
          />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[10px] border border-[var(--dbx-accent)] bg-[var(--dbx-accent)] px-3 py-2 text-sm font-semibold text-[#140a08] transition-colors hover:border-[var(--dbx-accent-soft)] hover:bg-[var(--dbx-accent-soft)] disabled:cursor-progress disabled:opacity-70"
            onClick={onSimulate}
            disabled={simulationLoading || !selectedIso3}
          >
            {simulationLoading ? "Loading..." : `Simulate for ${selectedCountryName ?? "country"}`}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ALLOCATION_STEPS.map((step) => (
            <button
              key={step.label}
              type="button"
              className="rounded-full border border-[var(--dbx-tab-border)] bg-[var(--dbx-tab-bg)] px-3 py-1 text-xs font-semibold text-[var(--dbx-tab-text)] transition-colors hover:border-[var(--dbx-accent)] hover:text-[var(--dbx-text)]"
              onClick={() => onAllocationAdjust(step.usd)}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${toggleClass(showImpactArrows)}`}
          onClick={() => onShowImpactArrowsChange(!showImpactArrows)}
        >
          Globe arrows
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${toggleClass(showQuarterlyChart)}`}
          onClick={() => setShowQuarterlyChart((value) => !value)}
        >
          Quarterly trend chart
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${toggleClass(showLeaderboardGraph)}`}
          onClick={() => setShowLeaderboardGraph((value) => !value)}
        >
          Leaderboard graph
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${toggleClass(showImpactTable)}`}
          onClick={() => setShowImpactTable((value) => !value)}
        >
          Impact matrix
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${toggleClass(showMetricsHeatmap)}`}
          onClick={() => setShowMetricsHeatmap((value) => !value)}
        >
          Metrics heatmap
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${toggleClass(showModelPredictions)}`}
          onClick={() => setShowModelPredictions((value) => !value)}
        >
          Model forecast
        </button>
      </div>

      {simulationLoading ? (
        <PanelLoading
          label="Running ML-linked funding simulation"
          rows={4}
          className="mt-3 border-t border-dashed border-[var(--dbx-border)] pt-3"
        />
      ) : simulation ? (
        <div className="mt-3 grid gap-3 border-t border-dashed border-[var(--dbx-border)] pt-3">
          <div className="break-words rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3 text-sm text-[var(--dbx-text-muted)]">
            Allocation {formatUsd(Number(simulation.allocation_usd || 0))} for {selectedCountryName ?? simulation.iso3}. ML source: {simulation.ml_context.source_path} | projection points: {simulation.ml_context.projection_points} | neglect-flag gating: {simulation.ml_context.uses_neglect_flag ? "active" : "not available"}.
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-[var(--dbx-text-muted)]">Rank Change</p>
              <p className="m-0 mt-1 text-xl font-semibold">{simulation.rank_delta >= 0 ? "+" : ""}{simulation.rank_delta}</p>
              <p className="m-0 text-xs text-[var(--dbx-text-muted)]">#{simulation.base.rank} to #{simulation.scenario.rank}</p>
            </div>
            <div className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-[var(--dbx-text-muted)]">OCI Shift</p>
              <p className="m-0 mt-1 text-xl font-semibold">{formatSigned(simulation.overall_score_delta)}</p>
              <p className="m-0 text-xs text-[var(--dbx-text-muted)]">{simulation.base.oci.toFixed(2)} to {simulation.scenario.oci.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-[var(--dbx-text-muted)]">Projected Neglect</p>
              <p className="m-0 mt-1 text-xl font-semibold">{simulation.scenario.projected_neglect.toFixed(2)}</p>
              <p className="m-0 text-xs text-[var(--dbx-text-muted)]">
                {q1 && q8 ? `${q1.projected_neglect.toFixed(2)} to ${q8.projected_neglect.toFixed(2)}` : "Q+8 estimate"}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-[var(--dbx-text-muted)]">Funding Coverage</p>
              <p className="m-0 mt-1 text-xl font-semibold">{simulation.scenario.percent_funded.toFixed(1)}%</p>
              <p className="m-0 text-xs text-[var(--dbx-text-muted)]">
                {simulation.base.percent_funded.toFixed(1)}% to {simulation.scenario.percent_funded.toFixed(1)}%
              </p>
            </div>
          </div>

          {showModelPredictions ? (
            <section className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="m-0 text-sm font-semibold text-[var(--dbx-text)]">Model Prediction Outlook</h3>
                <p className="m-0 text-xs text-[var(--dbx-text-muted)]">Neglect threshold reference: 65</p>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-2">
                  <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-[var(--dbx-text-muted)]">Projected trend</p>
                  <p className="m-0 mt-1 text-base font-semibold capitalize text-[var(--dbx-text)]">{modelOutlook.trend}</p>
                  <p className="m-0 text-xs text-[var(--dbx-text-muted)]">
                    {modelOutlook.start_projected_neglect !== null && modelOutlook.horizon_projected_neglect !== null
                      ? `${modelOutlook.start_projected_neglect.toFixed(2)} to ${modelOutlook.horizon_projected_neglect.toFixed(2)}`
                      : "Awaiting forecast points"}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-2">
                  <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-[var(--dbx-text-muted)]">Horizon risk</p>
                  <p className="m-0 mt-1 text-base font-semibold capitalize text-[var(--dbx-text)]">{modelOutlook.horizon_risk_level}</p>
                  <p className="m-0 text-xs text-[var(--dbx-text-muted)]">
                    {modelOutlook.first_below_threshold_quarter
                      ? `First below threshold: ${modelOutlook.first_below_threshold_quarter}`
                      : "No threshold crossing in horizon"}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-2">
                  <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-[var(--dbx-text-muted)]">Projected improvement</p>
                  <p className="m-0 mt-1 text-base font-semibold text-[var(--dbx-text)]">
                    {modelOutlook.projected_improvement_pct >= 0 ? "+" : ""}{modelOutlook.projected_improvement_pct.toFixed(1)}%
                  </p>
                  <p className="m-0 text-xs text-[var(--dbx-text-muted)]">
                    Peak risk quarter: {modelOutlook.peak_risk_quarter ?? "n/a"}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-2">
                  <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-[var(--dbx-text-muted)]">MLP flag signals</p>
                  <p className="m-0 mt-1 text-base font-semibold text-[var(--dbx-text)]">
                    {modelOutlook.flagged_quarters} / {quarters.length}
                  </p>
                  <p className="m-0 text-xs text-[var(--dbx-text-muted)]">
                    cleared: {modelOutlook.cleared_quarters}, unknown: {modelOutlook.unknown_quarters}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h4 className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dbx-text-muted)]">
                    Quarterly Neglect Delta
                  </h4>
                  <p className="m-0 text-[11px] text-[var(--dbx-text-muted)]">Negative bars indicate predicted relief</p>
                </div>
                <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface)] p-1">
                  <svg
                    className="block h-auto min-w-[560px] w-full"
                    viewBox={`0 0 ${DELTA_CHART.width} ${DELTA_CHART.height}`}
                    role="img"
                    aria-label="Quarter-over-quarter neglect delta chart"
                  >
                  {deltaTicks.map((tick) => {
                    const y = scaleY(tick, -neglectDeltaMax, neglectDeltaMax, DELTA_CHART);
                    return (
                      <g key={`delta-grid-${tick}`}>
                        <line
                          x1={DELTA_CHART.padding.left}
                          y1={y}
                          x2={DELTA_CHART.width - DELTA_CHART.padding.right}
                          y2={y}
                          stroke={tick === 0 ? "rgba(148,163,184,0.75)" : "rgba(148,163,184,0.24)"}
                          strokeDasharray={tick === 0 ? "0" : "4 4"}
                        />
                        <text
                          x={DELTA_CHART.padding.left - 8}
                          y={y + 4}
                          textAnchor="end"
                          fontSize="10"
                          fill="rgba(148,163,184,0.9)"
                        >
                          {formatSigned(tick, 1)}
                        </text>
                      </g>
                    );
                  })}
                  {neglectDeltaRows.map((row, index) => {
                    const slotWidth = chartInnerWidth(DELTA_CHART) / Math.max(neglectDeltaRows.length, 1);
                    const barWidth = Math.max(10, Math.min(30, slotWidth * 0.62));
                    const x = DELTA_CHART.padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
                    const targetY = scaleY(row.delta, -neglectDeltaMax, neglectDeltaMax, DELTA_CHART);
                    const y = row.delta >= 0 ? targetY : deltaZeroY;
                    const barHeight = Math.max(2, Math.abs(deltaZeroY - targetY));
                    const fill = row.delta > 0 ? "rgba(239, 68, 68, 0.9)" : row.delta < 0 ? "rgba(34, 197, 94, 0.9)" : "rgba(148, 163, 184, 0.75)";
                    const labelY = row.delta >= 0 ? y - 6 : y + barHeight + 12;
                    const labelAnchor = row.delta >= 0 ? "end" : "start";

                    return (
                      <g key={row.quarterLabel}>
                        <rect x={x} y={y} width={barWidth} height={barHeight} fill={fill} rx={3} />
                        <text
                          x={x + barWidth / 2}
                          y={DELTA_CHART.height - DELTA_CHART.padding.bottom + 16}
                          textAnchor="middle"
                          fontSize="10"
                          fill="rgba(148,163,184,0.9)"
                        >
                          {row.quarterLabel}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={labelY}
                          textAnchor="middle"
                          dominantBaseline={labelAnchor === "end" ? "auto" : "hanging"}
                          fontSize="10"
                          fill={row.delta > 0 ? "rgba(248,113,113,0.95)" : row.delta < 0 ? "rgba(74,222,128,0.95)" : "rgba(148,163,184,0.95)"}
                        >
                          {formatSigned(row.delta)}
                        </text>
                      </g>
                    );
                  })}
                  </svg>
                </div>
                <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface)] p-1">
                  <div className="grid min-w-[560px] grid-cols-2 gap-2 sm:grid-cols-4">
                    {neglectDeltaRows.map((row) => (
                      <div key={`${row.quarterLabel}-delta`} className="rounded border border-[var(--dbx-border-soft)] px-2 py-1 text-[11px] text-[var(--dbx-text-muted)]">
                        <p className="m-0 font-semibold text-[var(--dbx-text)]">{row.quarterLabel}</p>
                        <p className="m-0">delta {formatSigned(row.delta)}</p>
                        <p className="m-0">score {row.projectedNeglect.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {showQuarterlyChart ? (
            <section className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="m-0 text-sm font-semibold text-[var(--dbx-text)]">Quarterly OCI and Neglect Trajectory</h3>
                <p className="m-0 text-xs text-[var(--dbx-text-muted)]">{quarterLabels.join(" / ")}</p>
              </div>
              <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface)] p-1">
                <svg
                  className="block h-auto min-w-[560px] w-full"
                  viewBox={`0 0 ${TREND_CHART.width} ${TREND_CHART.height}`}
                  role="img"
                  aria-label="Quarterly OCI and neglect line chart"
                >
                <defs>
                  <linearGradient id="ociFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(249,115,22,0.35)" />
                    <stop offset="100%" stopColor="rgba(249,115,22,0.02)" />
                  </linearGradient>
                  <linearGradient id="neglectFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(56,189,248,0.3)" />
                    <stop offset="100%" stopColor="rgba(56,189,248,0.02)" />
                  </linearGradient>
                </defs>
                {trendTicks.map((tick) => {
                  const y = scaleY(tick, trendMinValue, trendMaxValue, TREND_CHART);
                  return (
                    <g key={`trend-grid-${tick}`}>
                      <line
                        x1={TREND_CHART.padding.left}
                        y1={y}
                        x2={TREND_CHART.width - TREND_CHART.padding.right}
                        y2={y}
                        stroke="rgba(148,163,184,0.22)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={TREND_CHART.padding.left - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="rgba(148,163,184,0.9)"
                      >
                        {tick.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
                <line
                  x1={TREND_CHART.padding.left}
                  y1={TREND_CHART.height - TREND_CHART.padding.bottom}
                  x2={TREND_CHART.width - TREND_CHART.padding.right}
                  y2={TREND_CHART.height - TREND_CHART.padding.bottom}
                  stroke="rgba(148,163,184,0.45)"
                />
                <path d={ociAreaPath} fill="url(#ociFill)" />
                <path d={neglectAreaPath} fill="url(#neglectFill)" />
                <path d={ociPath} fill="none" stroke="#f97316" strokeWidth="2.4" />
                <path d={neglectPath} fill="none" stroke="#38bdf8" strokeWidth="2.4" />
                {quarterLabels.map((label, index) => {
                  const x = scaleX(index, quarterLabels.length, TREND_CHART);
                  return (
                    <text
                      key={`${label}-tick`}
                      x={x}
                      y={TREND_CHART.height - TREND_CHART.padding.bottom + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fill="rgba(148,163,184,0.9)"
                    >
                      {label}
                    </text>
                  );
                })}
                {ociPoints.map((point, index) => (
                  <circle key={`oci-${index}`} cx={point.x} cy={point.y} r="3.1" fill="#f97316" stroke="#f8fafc" strokeWidth="1.1" />
                ))}
                {neglectPoints.map((point, index) => (
                  <circle key={`neg-${index}`} cx={point.x} cy={point.y} r="3.1" fill="#38bdf8" stroke="#f8fafc" strokeWidth="1.1" />
                ))}
                </svg>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--dbx-text-muted)]">
                <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-[#f97316]" /> OCI</span>
                <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-[#38bdf8]" /> Neglect</span>
              </div>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface)] p-1">
                <div className="grid min-w-[560px] grid-cols-2 gap-2 sm:grid-cols-4">
                  {quarters.slice(0, 8).map((quarter, index) => (
                    <div key={quarter.quarter_label} className="rounded border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-2">
                      <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[var(--dbx-text-muted)]">{quarter.quarter_label}</p>
                      <p className="m-0 mt-1 text-sm font-semibold">{formatUsdCompact(quarter.selected_country.funding_received)}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-[var(--dbx-border-soft)]">
                        <div
                          className="h-1.5 rounded-full bg-[var(--dbx-accent)]"
                          style={{
                            width: `${Math.max(
                              6,
                              Math.round((fundingSeries[index] / fundingMax) * 100)
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {showMetricsHeatmap ? (
            <section className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="m-0 text-sm font-semibold text-[var(--dbx-text)]">Quarterly Metrics Heatmap</h3>
                <p className="m-0 text-xs text-[var(--dbx-text-muted)]">Color indicates movement from Q+1 baseline</p>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[560px] border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-[var(--dbx-text-muted)]">
                      <th className="border-b border-[var(--dbx-border-soft)] pb-2 pr-3">Metric</th>
                      {quarterLabels.map((label) => (
                        <th key={`${label}-heatmap-head`} className="border-b border-[var(--dbx-border-soft)] pb-2 pr-2 text-right">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapRows.map((row) => (
                      <tr key={row.metric_key} className="align-top text-[var(--dbx-text)]">
                        <td className="border-b border-[var(--dbx-border-soft)] py-2 pr-3 font-semibold">{row.metric_label}</td>
                        {row.cells.map((cell) => (
                          <td key={`${row.metric_key}-${cell.quarter_label}`} className="border-b border-[var(--dbx-border-soft)] py-2 pr-2 text-right">
                            <div
                              className="rounded px-2 py-1 font-semibold text-[var(--dbx-text)]"
                              style={heatmapCellStyle(cell.status, cell.intensity)}
                            >
                              {formatHeatmapMetricValue(row.metric_key, cell.value)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--dbx-text-muted)]">
                <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" /> Improving signal</span>
                <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-[#ef4444]" /> Worsening signal</span>
                <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-[#94a3b8]" /> Flat / uncertain</span>
              </div>
            </section>
          ) : null}

          {showLeaderboardGraph ? (
            <section className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <h3 className="m-0 text-sm font-semibold text-[var(--dbx-text)]">Global Leaderboard Shift (Top 10)</h3>
              <div className="mt-2 grid gap-2">
                {leaderboardRows.map((row) => {
                  const pct = Math.max(6, Math.round((Math.abs(row.oci_delta) / leaderboardMax) * 100));
                  const isPressure = row.oci_delta > 0;
                  const barColor = isPressure ? "bg-[#ef4444]" : row.oci_delta < 0 ? "bg-[#22c55e]" : "bg-[#94a3b8]";
                  return (
                    <div key={row.iso3} className="rounded border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[var(--dbx-text)]">{row.country}</span>
                        <span className="text-[var(--dbx-text-muted)]">#{row.rank_before} to #{row.rank_after}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-[var(--dbx-border-soft)]">
                        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="m-0 mt-1 text-xs text-[var(--dbx-text-muted)]">
                        OCI {formatSigned(row.oci_delta)} | Rank {row.rank_delta >= 0 ? "+" : ""}{row.rank_delta}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {showImpactTable ? (
            <section className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <h3 className="m-0 text-sm font-semibold text-[var(--dbx-text)]">Country Impact Matrix (OCI + Neglect)</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[560px] border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-[var(--dbx-text-muted)]">
                      <th className="border-b border-[var(--dbx-border-soft)] pb-2 pr-3">Country</th>
                      <th className="border-b border-[var(--dbx-border-soft)] pb-2 pr-3">Rank delta</th>
                      <th className="border-b border-[var(--dbx-border-soft)] pb-2 pr-3">OCI delta</th>
                      <th className="border-b border-[var(--dbx-border-soft)] pb-2 pr-3">Neglect delta</th>
                      <th className="border-b border-[var(--dbx-border-soft)] pb-2">Relation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.country_impacts.slice(0, 10).map((impact) => (
                      <tr key={impact.iso3} className="align-top text-[var(--dbx-text)]">
                        <td className="border-b border-[var(--dbx-border-soft)] py-2 pr-3 font-semibold">{impact.country}</td>
                        <td className="border-b border-[var(--dbx-border-soft)] py-2 pr-3">{impact.rank_delta >= 0 ? "+" : ""}{impact.rank_delta}</td>
                        <td className="border-b border-[var(--dbx-border-soft)] py-2 pr-3">{formatSigned(impact.overall_score_delta)}</td>
                        <td className="border-b border-[var(--dbx-border-soft)] py-2 pr-3">{formatSigned(impact.projected_neglect_delta)}</td>
                        <td className="border-b border-[var(--dbx-border-soft)] py-2">{impact.relation.replaceAll("_", " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3 text-sm text-[var(--dbx-text-muted)]">
          Configure allocation, choose visualization toggles, then run a scenario to generate OCI graphs, model forecasts, quarterly heatmaps, and leaderboard impacts.
        </div>
      )}
    </motion.article>
  );
}
