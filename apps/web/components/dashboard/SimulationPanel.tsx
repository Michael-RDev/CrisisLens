import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SimulationResponse } from "@/lib/api/crisiswatch";
import { PanelLoading } from "@/components/dashboard/PanelLoading";
import { countryByIso3 } from "@/lib/countries";

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
const CHART_WIDTH = 360;
const CHART_HEIGHT = 120;
const CHART_PADDING = 12;

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

function buildLinePath(values: number[]): string {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1e-9);
  const denominator = Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = CHART_PADDING + (index / denominator) * (CHART_WIDTH - CHART_PADDING * 2);
      const y =
        CHART_HEIGHT -
        CHART_PADDING -
        ((value - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildLinePoints(values: number[]): Array<{ x: number; y: number }> {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1e-9);
  const denominator = Math.max(values.length - 1, 1);

  return values.map((value, index) => ({
    x: CHART_PADDING + (index / denominator) * (CHART_WIDTH - CHART_PADDING * 2),
    y:
      CHART_HEIGHT -
      CHART_PADDING -
      ((value - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2)
  }));
}

function toggleClass(isActive: boolean): string {
  return isActive
    ? "border-[var(--dbx-accent)] bg-[var(--dbx-tab-active-bg)] text-[var(--dbx-tab-active-text)]"
    : "border-[var(--dbx-tab-border)] bg-[var(--dbx-tab-bg)] text-[var(--dbx-tab-text)]";
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

  const quarters = simulation?.quarters ?? [];
  const quarterLabels = quarters.map((quarter) => quarter.quarter_label);
  const ociSeries = quarters.map((quarter) => quarter.selected_country.oci);
  const neglectSeries = quarters.map((quarter) => quarter.selected_country.projected_neglect);
  const fundingSeries = quarters.map((quarter) => quarter.selected_country.funding_received);
  const ociPath = useMemo(() => buildLinePath(ociSeries), [ociSeries]);
  const neglectPath = useMemo(() => buildLinePath(neglectSeries), [neglectSeries]);
  const ociPoints = useMemo(() => buildLinePoints(ociSeries), [ociSeries]);
  const neglectPoints = useMemo(() => buildLinePoints(neglectSeries), [neglectSeries]);
  const fundingMax = Math.max(...fundingSeries, 1);
  const leaderboardRows = simulation?.leaderboard_changes.slice(0, 10) ?? [];
  const leaderboardMax = Math.max(...leaderboardRows.map((row) => Math.abs(row.oci_delta)), 0.5);
  const q1 = quarters[0]?.selected_country ?? null;
  const q8 = quarters[quarters.length - 1]?.selected_country ?? null;

  return (
    <motion.article
      className="min-w-0 overflow-hidden rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]"
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
      </div>

      {simulationLoading ? (
        <PanelLoading
          label="Running ML-linked funding simulation"
          rows={4}
          className="mt-3 border-t border-dashed border-[var(--dbx-border)] pt-3"
        />
      ) : simulation ? (
        <div className="mt-3 grid gap-3 border-t border-dashed border-[var(--dbx-border)] pt-3">
          <div className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3 text-sm text-[var(--dbx-text-muted)]">
            Allocation {formatUsd(Number(simulation.allocation_usd || 0))} for {selectedCountryName ?? simulation.iso3}. ML source: {simulation.ml_context.source_path} | projection points: {simulation.ml_context.projection_points} | neglect-flag gating: {simulation.ml_context.uses_neglect_flag ? "active" : "not available"}.
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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

          {showQuarterlyChart ? (
            <section className="rounded-xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="m-0 text-sm font-semibold text-[var(--dbx-text)]">Quarterly OCI and Neglect Trajectory</h3>
                <p className="m-0 text-xs text-[var(--dbx-text-muted)]">{quarterLabels.join(" / ")}</p>
              </div>
              <svg className="mt-2 w-full" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="Quarterly simulation trend chart">
                <path d={ociPath} fill="none" stroke="#f97316" strokeWidth="2.2" />
                <path d={neglectPath} fill="none" stroke="#38bdf8" strokeWidth="2.2" />
                {ociPoints.map((point, index) => (
                  <circle key={`oci-${index}`} cx={point.x} cy={point.y} r="2.5" fill="#f97316" />
                ))}
                {neglectPoints.map((point, index) => (
                  <circle key={`neg-${index}`} cx={point.x} cy={point.y} r="2.5" fill="#38bdf8" />
                ))}
              </svg>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--dbx-text-muted)]">
                <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-[#f97316]" /> OCI</span>
                <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-[#38bdf8]" /> Neglect</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
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
                <table className="min-w-full border-collapse text-xs">
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
          Configure allocation, choose visualization toggles, then run a scenario to generate OCI, neglected-score, and leaderboard impact graphs.
        </div>
      )}
    </motion.article>
  );
}
