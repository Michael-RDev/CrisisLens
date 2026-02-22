import { clampToPercent, computeDerivedMetrics } from "@/lib/metrics";
import { CountryMetrics, FutureProjection } from "@/lib/types";

/**
 * Score at or above this threshold → country is classified as neglected.
 * Mirrors NEGLECT_THRESHOLD in apps/ml/models/train_model.py.
 */
export const NEGLECT_THRESHOLD = 65;

/**
 * Returns the PyTorch MLP binary neglect prediction for the given country at
 * the requested horizon.  Picks the closest available `futureProjections` entry
 * that has a `neglectFlagPred` boolean.  Returns null when no flag is available.
 */
function getPyTorchNeglectFlag(row: CountryMetrics, monthsAhead: number): boolean | null {
  const projections = Array.isArray(row.futureProjections) ? row.futureProjections : [];
  const withFlag = projections.filter(
    (p) => typeof p.neglectFlagPred === "boolean" && p.monthsAhead > 0
  );
  if (withFlag.length === 0) return null;
  const nearest = withFlag.reduce((best, p) =>
    Math.abs(p.monthsAhead - monthsAhead) < Math.abs(best.monthsAhead - monthsAhead) ? p : best
  );
  return nearest.neglectFlagPred ?? null;
}

const OCI_WEIGHTS = {
  severity: 0.32,
  inNeedRate: 0.28,
  fundingGap: 0.22,
  coverageMismatch: 0.18
};

export const QUARTERLY_STEPS: Array<{ quarterLabel: string; quarterIndex: number; monthsAhead: number }> = [
  { quarterLabel: "Q+1", quarterIndex: 1, monthsAhead: 3 },
  { quarterLabel: "Q+2", quarterIndex: 2, monthsAhead: 6 },
  { quarterLabel: "Q+3", quarterIndex: 3, monthsAhead: 9 },
  { quarterLabel: "Q+4", quarterIndex: 4, monthsAhead: 12 },
  { quarterLabel: "Q+5", quarterIndex: 5, monthsAhead: 15 },
  { quarterLabel: "Q+6", quarterIndex: 6, monthsAhead: 18 },
  { quarterLabel: "Q+7", quarterIndex: 7, monthsAhead: 21 },
  { quarterLabel: "Q+8", quarterIndex: 8, monthsAhead: 24 }
];

export type SimulationMetricOverride = {
  iso3: string;
  country: string;
  overlooked_score: number;
  severity_score: number;
  funding_received: number;
  percent_funded: number;
  projected_neglect: number;
};

export type SimulationQuarter = {
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
    /** Raw PyTorch MLP binary prediction for this horizon (null = no data). */
    neglect_flag_pred: boolean | null;
  };
  top_overlooked: Array<{
    rank: number;
    iso3: string;
    country: string;
    oci_score: number;
  }>;
  metrics_overrides: SimulationMetricOverride[];
};

export type QuarterlySimulationResult = {
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
    projected_neglect: number;
  };
  rank_delta: number;
  oci_delta: number;
  /** Signed (scenario - base) OCI score delta for direct +/- display. */
  overall_score_delta: number;
  top_overlooked_after: Array<{
    rank: number;
    iso3: string;
    country: string;
    oci_score: number;
  }>;
  leaderboard_changes: SimulationLeaderboardChange[];
  country_impacts: SimulationCountryImpact[];
  impact_arrows: SimulationImpactArrow[];
  quarters: SimulationQuarter[];
};

export type SimulationLeaderboardChange = {
  rank_before: number;
  rank_after: number;
  rank_delta: number;
  iso3: string;
  country: string;
  oci_before: number;
  oci_after: number;
  oci_delta: number;
};

export type SimulationCountryImpact = {
  iso3: string;
  country: string;
  rank_before: number;
  rank_after: number;
  rank_delta: number;
  overall_score_delta: number;
  direction: "up" | "down" | "flat";
  relation: "still_ahead" | "new_ahead" | "overtaken" | "behind_buffer" | "shifted";
};

export type SimulationImpactArrow = {
  from_iso3: string;
  to_iso3: string;
  country: string;
  direction: "pressure" | "relief" | "neutral";
  relation: SimulationCountryImpact["relation"];
  rank_delta: number;
  overall_score_delta: number;
  magnitude: number;
};

type ProjectionPoint = { monthsAhead: number; score: number };
type ComputedRow = {
  iso3: string;
  country: string;
  overlookedScore: number;
  severityScore: number;
  fundingReceived: number;
  percentFunded: number;
  projectedNeglect: number;
};

type ProjectedNeglectScenario = {
  fundingReceived?: number;
  percentFunded?: number;
};

function clampRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function fundingRequirement(row: CountryMetrics): number {
  return row.fundingRequired > 0 ? row.fundingRequired : row.revisedPlanRequirements;
}

function percentFundedFromFunding(row: CountryMetrics, fundingReceived: number): number {
  const requirement = fundingRequirement(row);
  if (requirement <= 0) return clampToPercent(row.percentFunded);
  return clampToPercent((fundingReceived / requirement) * 100);
}

function computeOciScore(row: CountryMetrics): number {
  const derived = computeDerivedMetrics(row);
  const severityComponent = clampToPercent(row.severityScore);
  const inNeedRateComponent = clampToPercent(derived.inNeedPct);
  const fundingGapComponent = clampToPercent(derived.fundingGapPct);
  const coverageMismatchComponent = clampToPercent(100 - derived.coveragePct);

  return Number(
    (
      severityComponent * OCI_WEIGHTS.severity +
      inNeedRateComponent * OCI_WEIGHTS.inNeedRate +
      fundingGapComponent * OCI_WEIGHTS.fundingGap +
      coverageMismatchComponent * OCI_WEIGHTS.coverageMismatch
    ).toFixed(2)
  );
}

function baselineNeglectScore(row: CountryMetrics): number {
  return clampToPercent(
    row.ensembleScore ??
      row.neglectScore ??
      row.modelScores?.ensemble ??
      row.overlookedScore ??
      row.severityScore
  );
}

function inferMonthsAhead(step: string, fallback = 0): number {
  const normalized = String(step || "").trim().toLowerCase();
  if (!normalized) return fallback;

  const quarterMatch = normalized.match(/^q\+?(\d+)$/);
  if (quarterMatch) return Number(quarterMatch[1]) * 3;

  const monthsMatch = normalized.match(/(\d+)\s*mo/);
  if (monthsMatch) return Number(monthsMatch[1]);

  return fallback;
}

function projectionPoints(row: CountryMetrics): ProjectionPoint[] {
  const projections = Array.isArray(row.futureProjections) ? row.futureProjections : [];
  if (projections.length === 0) return [];

  const points = projections
    .map((projection: FutureProjection) => {
      const monthsAhead = projection.monthsAhead > 0
        ? projection.monthsAhead
        : inferMonthsAhead(projection.step, 0);
      const score = clampToPercent(
        projection.scores?.ensembleScore ?? projection.scores?.neglectScore ?? projection.scores?.lgbm ?? Number.NaN
      );
      if (monthsAhead <= 0 || !Number.isFinite(score)) return null;
      return { monthsAhead, score };
    })
    .filter((point): point is ProjectionPoint => Boolean(point))
    .sort((a, b) => a.monthsAhead - b.monthsAhead);

  const deduped = new Map<number, number>();
  for (const point of points) deduped.set(point.monthsAhead, point.score);
  return [...deduped.entries()]
    .map(([monthsAhead, score]) => ({ monthsAhead, score }))
    .sort((a, b) => a.monthsAhead - b.monthsAhead);
}

function fundingCoveragePct(reqUsd: number, fundedUsd: number): number {
  if (!Number.isFinite(reqUsd) || reqUsd <= 0) return 0;
  return clampToPercent((Math.max(fundedUsd, 0) / reqUsd) * 100);
}

function fundingTrendDrift(row: CountryMetrics): number {
  const trend = Array.isArray(row.fundingTrend) ? row.fundingTrend : [];
  const valid = trend
    .filter(
      (point) =>
        Number.isFinite(point?.year) &&
        Number.isFinite(point?.req_usd) &&
        Number.isFinite(point?.funded_usd)
    )
    .sort((a, b) => a.year - b.year);
  if (valid.length < 2) return 0;

  const recent = valid.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const firstCoverage = fundingCoveragePct(first.req_usd, first.funded_usd);
  const lastCoverage = fundingCoveragePct(last.req_usd, last.funded_usd);
  const coverageDelta = lastCoverage - firstCoverage;

  // Improving historical coverage should reduce neglect drift; worsening does the opposite.
  return clampRange((-coverageDelta / 100) * 0.32, -0.32, 0.32);
}

function nonEventQuarterDrift(row: CountryMetrics): number {
  const base = baselineNeglectScore(row);
  const derived = computeDerivedMetrics(row);
  const structuralPressure = clampToPercent(row.severityScore * 0.6 + derived.fundingGapPct * 0.4);
  const convergenceDrift = (structuralPressure - base) * 0.08;

  // Keep forecasts moving even without explicit event inputs by using structural risk pressure.
  const structuralDrift = ((derived.fundingGapPct + row.severityScore) / 200 - 0.5) * 0.9;
  const unmetNeedDrift = (Math.max(derived.inNeedPct - derived.coveragePct, 0) / 100) * 0.28;
  const trendDrift = fundingTrendDrift(row);

  const combined = clampRange(convergenceDrift + structuralDrift + unmetNeedDrift + trendDrift, -2.2, 2.2);
  if (Math.abs(combined) >= 0.12) return combined;
  return combined >= 0 ? 0.12 : -0.12;
}

function fallbackProjectedNeglect(row: CountryMetrics, monthsAhead: number): number {
  const base = baselineNeglectScore(row);
  const quarterDrift = nonEventQuarterDrift(row);
  const quartersAhead = monthsAhead / 3;
  return clampToPercent(base + quarterDrift * quartersAhead);
}

/** Pure regression interpolation/extrapolation – no MLP constraint. */
function regressionNeglectAtMonths(row: CountryMetrics, monthsAhead: number): number {
  const base = baselineNeglectScore(row);
  const points = projectionPoints(row);
  if (points.length === 0 || monthsAhead <= 0) {
    return monthsAhead <= 0 ? base : fallbackProjectedNeglect(row, monthsAhead);
  }

  const exact = points.find((point) => point.monthsAhead === monthsAhead);
  if (exact) return exact.score;

  const first = points[0];
  if (monthsAhead < first.monthsAhead) {
    const ratio = monthsAhead / Math.max(first.monthsAhead, 1);
    return clampToPercent(base + (first.score - base) * ratio);
  }

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const next = points[index];
    if (monthsAhead > prev.monthsAhead && monthsAhead < next.monthsAhead) {
      const ratio = (monthsAhead - prev.monthsAhead) / Math.max(next.monthsAhead - prev.monthsAhead, 1);
      return clampToPercent(prev.score + (next.score - prev.score) * ratio);
    }
  }

  if (points.length >= 2) {
    const prev = points[points.length - 2];
    const next = points[points.length - 1];
    const slope = (next.score - prev.score) / Math.max(next.monthsAhead - prev.monthsAhead, 1);
    const projected = next.score + slope * (monthsAhead - next.monthsAhead);
    return clampToPercent(projected);
  }

  const only = points[0];
  const tailSlope = (only.score - base) / Math.max(only.monthsAhead, 1);
  return clampToPercent(only.score + tailSlope * (monthsAhead - only.monthsAhead));
}

function fundingAdjustedNeglect(args: {
  row: CountryMetrics;
  monthsAhead: number;
  rawNeglect: number;
  scenario: ProjectedNeglectScenario;
}): number {
  const baseFundingReceived = Math.max(args.row.fundingReceived, 0);
  const scenarioFundingReceived =
    typeof args.scenario.fundingReceived === "number"
      ? Math.max(args.scenario.fundingReceived, 0)
      : baseFundingReceived;
  const basePercentFunded = percentFundedFromFunding(args.row, baseFundingReceived);
  const scenarioPercentFunded =
    typeof args.scenario.percentFunded === "number"
      ? clampToPercent(args.scenario.percentFunded)
      : percentFundedFromFunding(args.row, scenarioFundingReceived);

  const addedFundingUsd = Math.max(scenarioFundingReceived - baseFundingReceived, 0);
  const fundedGainPctPoints = Math.max(scenarioPercentFunded - basePercentFunded, 0);
  if (addedFundingUsd <= 0 && fundedGainPctPoints <= 0) return args.rawNeglect;

  const requirement = fundingRequirement(args.row);
  const allocationSharePct = requirement > 0 ? clampToPercent((addedFundingUsd / requirement) * 100) : 0;
  const fundingGapPct = computeDerivedMetrics(args.row).fundingGapPct;
  const gapResponsiveness = 0.45 + (fundingGapPct / 100) * 0.55;
  const horizonResponsiveness = 0.55 + 0.45 * (Math.min(Math.max(args.monthsAhead, 0), 24) / 24);

  // Apply diminishing returns so large allocations help more, without collapsing the score.
  const reduction =
    (Math.sqrt(fundedGainPctPoints) * 0.9 + Math.log1p(allocationSharePct) * 1.8) *
    gapResponsiveness *
    horizonResponsiveness;

  return clampToPercent(args.rawNeglect - reduction);
}

/**
 * Projected neglect score at `monthsAhead` for `row`.
 *
 * Uses regression ensemble interpolation as the base estimate, then applies a
 * funding-response adjustment from the scenario (when funding is increased), and
 * finally applies a floor/ceiling from the PyTorch MLP binary classifier:
 *   - added funding           → lower neglect score via diminishing-return curve
 *   - neglectFlagPred = true  → score is floored at NEGLECT_THRESHOLD (≥65)
 *   - neglectFlagPred = false → score is capped  at NEGLECT_THRESHOLD - 0.1 (<65)
 *   - no flag available       → regression score used as-is
 */
export function projectedNeglectAtMonths(
  row: CountryMetrics,
  monthsAhead: number,
  scenario: ProjectedNeglectScenario = {}
): number {
  const raw = regressionNeglectAtMonths(row, monthsAhead);
  const scenarioAdjusted = fundingAdjustedNeglect({
    row,
    monthsAhead,
    rawNeglect: raw,
    scenario
  });
  const mlpFlag = getPyTorchNeglectFlag(row, monthsAhead);
  if (mlpFlag === true)  return clampToPercent(Math.max(scenarioAdjusted, NEGLECT_THRESHOLD));
  if (mlpFlag === false) return clampToPercent(Math.min(scenarioAdjusted, NEGLECT_THRESHOLD - 0.1));
  return scenarioAdjusted;
}

function datasetAdjustment(row: CountryMetrics): number {
  const donorDiversityScore = clampToPercent(row.donorDiversityScore ?? 50);
  const donorRisk = (100 - donorDiversityScore) * 0.08;

  const fundingBaseline = Math.max(row.fundingReceived, 1);
  const internalFundingSharePct = clampToPercent(((row.internalFundingUsd ?? 0) / fundingBaseline) * 100);
  const internalFundingPressure = internalFundingSharePct * 0.03;

  const clusterGapPressure = clampToPercent(row.globalClusterGapPct ?? 0) * 0.05;

  return Number(Math.min(Math.max(donorRisk + internalFundingPressure + clusterGapPressure, 0), 16).toFixed(2));
}

function computeQuarterRows(
  metrics: CountryMetrics[],
  selectedIso3: string,
  allocationUsd: number,
  allocationProgress: number,
  monthsAhead: number
): ComputedRow[] {
  const selectedIso = selectedIso3.toUpperCase();
  const allocationApplied = Math.max(allocationUsd, 0) * allocationProgress;

  return metrics.map((row) => {
    const extraFunding = row.iso3 === selectedIso ? allocationApplied : 0;
    const fundingReceived = row.fundingReceived + extraFunding;
    const fundingRequired = fundingRequirement(row);
    const percentFunded =
      fundingRequired > 0
        ? clampToPercent((fundingReceived / fundingRequired) * 100)
        : clampToPercent(row.percentFunded);

    const projectedNeglect = projectedNeglectAtMonths(row, monthsAhead, {
      fundingReceived,
      percentFunded
    });
    const severityScore = clampToPercent(row.severityScore * 0.55 + projectedNeglect * 0.45);

    const ociBase = computeOciScore({
      ...row,
      fundingReceived,
      percentFunded,
      severityScore
    });

    return {
      iso3: row.iso3,
      country: row.country,
      overlookedScore: clampToPercent(ociBase + datasetAdjustment(row)),
      severityScore,
      fundingReceived,
      percentFunded,
      projectedNeglect
    };
  });
}

function rankRows(rows: ComputedRow[]): ComputedRow[] {
  return [...rows].sort((a, b) => b.overlookedScore - a.overlookedScore);
}

type RankedComputedRow = ComputedRow & { rank: number };

function withRanks(rows: ComputedRow[]): RankedComputedRow[] {
  return rankRows(rows).map((row, index) => ({
    ...row,
    rank: index + 1
  }));
}

function collectNeighborIso3(
  rankedRows: RankedComputedRow[],
  selectedIso3: string,
  radius = 2
): Set<string> {
  const out = new Set<string>();
  const selectedIndex = rankedRows.findIndex((row) => row.iso3 === selectedIso3);
  if (selectedIndex < 0) return out;

  for (
    let index = Math.max(0, selectedIndex - radius);
    index <= Math.min(rankedRows.length - 1, selectedIndex + radius);
    index += 1
  ) {
    const iso3 = rankedRows[index]?.iso3;
    if (iso3 && iso3 !== selectedIso3) out.add(iso3);
  }
  return out;
}

function classifyRelation(args: {
  selectedBaseRank: number;
  selectedScenarioRank: number;
  rankBefore: number;
  rankAfter: number;
}): SimulationCountryImpact["relation"] {
  const wasAhead = args.rankBefore < args.selectedBaseRank;
  const isAhead = args.rankAfter < args.selectedScenarioRank;

  if (wasAhead && !isAhead) return "overtaken";
  if (!wasAhead && isAhead) return "new_ahead";
  if (isAhead) return "still_ahead";
  if (!isAhead && args.rankBefore === args.rankAfter) return "behind_buffer";
  return "shifted";
}

function buildCountryImpacts(args: {
  selectedIso3: string;
  baseRanked: RankedComputedRow[];
  scenarioRanked: RankedComputedRow[];
}): { countryImpacts: SimulationCountryImpact[]; impactArrows: SimulationImpactArrow[] } {
  const baseByIso = new Map(args.baseRanked.map((row) => [row.iso3, row]));
  const scenarioByIso = new Map(args.scenarioRanked.map((row) => [row.iso3, row]));
  const selectedBase = baseByIso.get(args.selectedIso3);
  const selectedScenario = scenarioByIso.get(args.selectedIso3);
  if (!selectedBase || !selectedScenario) {
    return { countryImpacts: [], impactArrows: [] };
  }

  const neighborIso = new Set<string>();
  for (const iso3 of collectNeighborIso3(args.baseRanked, args.selectedIso3, 2)) {
    neighborIso.add(iso3);
  }
  for (const iso3 of collectNeighborIso3(args.scenarioRanked, args.selectedIso3, 2)) {
    neighborIso.add(iso3);
  }

  const movers = args.scenarioRanked
    .filter((row) => row.iso3 !== args.selectedIso3)
    .map((row) => {
      const base = baseByIso.get(row.iso3);
      if (!base) return null;
      const rankDelta = base.rank - row.rank;
      if (rankDelta !== 0) return row.iso3;
      return null;
    })
    .filter((iso3): iso3 is string => Boolean(iso3));

  for (const iso3 of movers.slice(0, 6)) {
    neighborIso.add(iso3);
  }

  const countryImpacts = [...neighborIso]
    .map((iso3): SimulationCountryImpact | null => {
      const base = baseByIso.get(iso3);
      const scenario = scenarioByIso.get(iso3);
      if (!base || !scenario) return null;
      const rankDelta = base.rank - scenario.rank;
      const overallScoreDelta = Number((scenario.overlookedScore - base.overlookedScore).toFixed(2));
      const direction: SimulationCountryImpact["direction"] =
        rankDelta > 0 ? "up" : rankDelta < 0 ? "down" : "flat";

      return {
        iso3,
        country: scenario.country,
        rank_before: base.rank,
        rank_after: scenario.rank,
        rank_delta: rankDelta,
        overall_score_delta: overallScoreDelta,
        direction,
        relation: classifyRelation({
          selectedBaseRank: selectedBase.rank,
          selectedScenarioRank: selectedScenario.rank,
          rankBefore: base.rank,
          rankAfter: scenario.rank
        })
      };
    })
    .filter((impact): impact is SimulationCountryImpact => Boolean(impact))
    .sort((a, b) => {
      const rankShift = Math.abs(b.rank_delta) - Math.abs(a.rank_delta);
      if (rankShift !== 0) return rankShift;
      const scoreShift = Math.abs(b.overall_score_delta) - Math.abs(a.overall_score_delta);
      if (scoreShift !== 0) return scoreShift;
      return a.rank_after - b.rank_after;
    })
    .slice(0, 8);

  const impactArrows: SimulationImpactArrow[] = countryImpacts.map((impact) => {
    const base = baseByIso.get(impact.iso3);
    const scenario = scenarioByIso.get(impact.iso3);

    let direction: SimulationImpactArrow["direction"] = "neutral";
    // Primary signal: this country's OCI change in the scenario.
    if (impact.overall_score_delta > 0.15) direction = "pressure";
    else if (impact.overall_score_delta < -0.15) direction = "relief";

    if (direction === "neutral" && base && scenario) {
      const rankGapBefore = base.rank - selectedBase.rank;
      const rankGapAfter = scenario.rank - selectedScenario.rank;
      const relativeRankGapDelta = rankGapAfter - rankGapBefore;

      const scoreGapBefore = base.overlookedScore - selectedBase.overlookedScore;
      const scoreGapAfter = scenario.overlookedScore - selectedScenario.overlookedScore;
      const relativeScoreGapDelta = scoreGapAfter - scoreGapBefore;

      if (relativeRankGapDelta > 0) direction = "pressure";
      else if (relativeRankGapDelta < 0) direction = "relief";
      else if (relativeScoreGapDelta > 0.2) direction = "pressure";
      else if (relativeScoreGapDelta < -0.2) direction = "relief";
    }

    // Fall back to relationship-only semantics if relative movement is flat.
    if (direction === "neutral") {
      if (impact.relation === "still_ahead" || impact.relation === "new_ahead") direction = "pressure";
      else if (impact.relation === "overtaken") direction = "relief";
      else if (impact.relation === "shifted") direction = impact.rank_delta > 0 ? "pressure" : "relief";
    }

    return {
      from_iso3: args.selectedIso3,
      to_iso3: impact.iso3,
      country: impact.country,
      direction,
      relation: impact.relation,
      rank_delta: impact.rank_delta,
      overall_score_delta: impact.overall_score_delta,
      magnitude: Number(
        (Math.abs(impact.rank_delta) + Math.max(Math.abs(impact.overall_score_delta), 0.5) * 0.25).toFixed(2)
      )
    };
  });

  return { countryImpacts, impactArrows };
}

function makeTopOverlooked(rankedRows: ComputedRow[]) {
  return rankedRows.slice(0, 12).map((row, index) => ({
    rank: index + 1,
    iso3: row.iso3,
    country: row.country,
    oci_score: Number(row.overlookedScore.toFixed(2))
  }));
}

function asOverrides(rows: ComputedRow[]): SimulationMetricOverride[] {
  return rows.map((row) => ({
    iso3: row.iso3,
    country: row.country,
    overlooked_score: Number(row.overlookedScore.toFixed(2)),
    severity_score: Number(row.severityScore.toFixed(2)),
    funding_received: Math.round(row.fundingReceived),
    percent_funded: Number(row.percentFunded.toFixed(2)),
    projected_neglect: Number(row.projectedNeglect.toFixed(2))
  }));
}

function buildLeaderboardChanges(args: {
  selectedIso3: string;
  baseRanked: RankedComputedRow[];
  scenarioRanked: RankedComputedRow[];
  limit?: number;
}): SimulationLeaderboardChange[] {
  const limit = Math.max(1, args.limit ?? 12);
  const baseByIso = new Map(args.baseRanked.map((row) => [row.iso3, row]));
  const scenarioByIso = new Map(args.scenarioRanked.map((row) => [row.iso3, row]));

  const targetIso = [...args.scenarioRanked.slice(0, limit).map((row) => row.iso3)];
  if (!targetIso.includes(args.selectedIso3)) {
    targetIso.push(args.selectedIso3);
  }

  return [...new Set(targetIso)]
    .map((iso3): SimulationLeaderboardChange | null => {
      const scenario = scenarioByIso.get(iso3);
      const base = baseByIso.get(iso3);
      if (!scenario || !base) return null;

      return {
        rank_before: base.rank,
        rank_after: scenario.rank,
        rank_delta: base.rank - scenario.rank,
        iso3,
        country: scenario.country,
        oci_before: Number(base.overlookedScore.toFixed(2)),
        oci_after: Number(scenario.overlookedScore.toFixed(2)),
        oci_delta: Number((scenario.overlookedScore - base.overlookedScore).toFixed(2))
      };
    })
    .filter((row): row is SimulationLeaderboardChange => Boolean(row))
    .sort((a, b) => a.rank_after - b.rank_after);
}

export function buildQuarterlySimulation(
  metrics: CountryMetrics[],
  iso3: string,
  allocationUsd: number
): QuarterlySimulationResult {
  const selectedIso3 = String(iso3 || "").trim().toUpperCase();
  if (!selectedIso3 || selectedIso3.length !== 3) {
    throw new Error("Invalid iso3.");
  }

  const baseRows = withRanks(computeQuarterRows(metrics, selectedIso3, 0, 0, 0));
  const baseCountry = baseRows.find((row) => row.iso3 === selectedIso3);
  if (!baseCountry) {
    throw new Error("Country not found in metrics.");
  }

  // Pre-look the selected country's original metrics for raw PyTorch MLP flags.
  const selectedOriginalRow = metrics.find((m) => m.iso3 === selectedIso3) ?? null;

  const quarters: SimulationQuarter[] = QUARTERLY_STEPS.map((step) => {
    const progress = step.quarterIndex / QUARTERLY_STEPS.length;
    const rows = computeQuarterRows(metrics, selectedIso3, allocationUsd, progress, step.monthsAhead);
    const ranked = withRanks(rows);
    const selectedCountry = ranked.find((row) => row.iso3 === selectedIso3);
    if (!selectedCountry) {
      throw new Error(`Country ${selectedIso3} missing in quarter ${step.quarterLabel}.`);
    }
    const neglectFlagPred = selectedOriginalRow
      ? getPyTorchNeglectFlag(selectedOriginalRow, step.monthsAhead)
      : null;

    return {
      quarter_label: step.quarterLabel,
      quarter_index: step.quarterIndex,
      months_ahead: step.monthsAhead,
      selected_country: {
        rank: selectedCountry.rank,
        oci: Number(selectedCountry.overlookedScore.toFixed(2)),
        overall_score_delta: Number((selectedCountry.overlookedScore - baseCountry.overlookedScore).toFixed(2)),
        funding_received: Math.round(selectedCountry.fundingReceived),
        percent_funded: Number(selectedCountry.percentFunded.toFixed(2)),
        projected_neglect: Number(selectedCountry.projectedNeglect.toFixed(2)),
        neglect_flag_pred: neglectFlagPred
      },
      top_overlooked: makeTopOverlooked(ranked),
      metrics_overrides: asOverrides(ranked)
    };
  });

  const finalQuarter = quarters[quarters.length - 1];
  const scenario = finalQuarter.selected_country;
  const lastStep = QUARTERLY_STEPS[QUARTERLY_STEPS.length - 1];
  const finalMonthsAhead = lastStep?.monthsAhead ?? 24;
  const finalRows = withRanks(
    computeQuarterRows(metrics, selectedIso3, allocationUsd, 1, finalMonthsAhead)
  );
  const leaderboardChanges = buildLeaderboardChanges({
    selectedIso3,
    baseRanked: baseRows,
    scenarioRanked: finalRows
  });
  const { countryImpacts, impactArrows } = buildCountryImpacts({
    selectedIso3,
    baseRanked: baseRows,
    scenarioRanked: finalRows
  });

  return {
    iso3: selectedIso3,
    allocation_usd: Math.max(0, Number(allocationUsd) || 0),
    base: {
      rank: baseCountry.rank,
      oci: Number(baseCountry.overlookedScore.toFixed(2)),
      funding_received: Math.round(baseCountry.fundingReceived),
      percent_funded: Number(baseCountry.percentFunded.toFixed(2))
    },
    scenario: {
      rank: scenario.rank,
      oci: scenario.oci,
      funding_received: scenario.funding_received,
      percent_funded: scenario.percent_funded,
      projected_neglect: scenario.projected_neglect
    },
    rank_delta: baseCountry.rank - scenario.rank,
    oci_delta: Number((baseCountry.overlookedScore - scenario.oci).toFixed(2)),
    overall_score_delta: Number((scenario.oci - baseCountry.overlookedScore).toFixed(2)),
    top_overlooked_after: finalQuarter.top_overlooked,
    leaderboard_changes: leaderboardChanges,
    country_impacts: countryImpacts,
    impact_arrows: impactArrows,
    quarters
  };
}
