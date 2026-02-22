type QuarterLike = {
  quarter_label: string;
  selected_country: {
    rank: number;
    oci: number;
    funding_received: number;
    percent_funded: number;
    projected_neglect: number;
    neglect_flag_pred: boolean | null;
  };
};

export type HeatmapMetricKey =
  | "oci"
  | "projected_neglect"
  | "percent_funded"
  | "funding_received"
  | "rank";

export type SimulationHeatmapCell = {
  quarter_label: string;
  value: number;
  normalized: number;
  intensity: number;
  status: "improve" | "worsen" | "flat";
};

export type SimulationHeatmapRow = {
  metric_key: HeatmapMetricKey;
  metric_label: string;
  higher_is_better: boolean;
  cells: SimulationHeatmapCell[];
};

export type SimulationModelOutlook = {
  trend: "improving" | "worsening" | "stable";
  flagged_quarters: number;
  cleared_quarters: number;
  unknown_quarters: number;
  first_below_threshold_quarter: string | null;
  peak_risk_quarter: string | null;
  horizon_risk_level: "high" | "elevated" | "watch" | "contained" | "unknown";
  projected_improvement_pct: number;
  start_projected_neglect: number | null;
  horizon_projected_neglect: number | null;
};

const EPSILON = 1e-9;

const METRIC_CONFIG: Array<{
  key: HeatmapMetricKey;
  label: string;
  higherIsBetter: boolean;
  value: (quarter: QuarterLike) => number;
}> = [
  { key: "oci", label: "OCI", higherIsBetter: false, value: (quarter) => quarter.selected_country.oci },
  {
    key: "projected_neglect",
    label: "Projected neglect",
    higherIsBetter: false,
    value: (quarter) => quarter.selected_country.projected_neglect
  },
  {
    key: "percent_funded",
    label: "Funding coverage",
    higherIsBetter: true,
    value: (quarter) => quarter.selected_country.percent_funded
  },
  {
    key: "funding_received",
    label: "Funding received",
    higherIsBetter: true,
    value: (quarter) => quarter.selected_country.funding_received
  },
  { key: "rank", label: "Global rank", higherIsBetter: false, value: (quarter) => quarter.selected_country.rank }
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toRiskLevel(projectedNeglect: number | null): SimulationModelOutlook["horizon_risk_level"] {
  if (projectedNeglect === null || !Number.isFinite(projectedNeglect)) return "unknown";
  if (projectedNeglect >= 75) return "high";
  if (projectedNeglect >= 60) return "elevated";
  if (projectedNeglect >= 45) return "watch";
  return "contained";
}

export function buildSimulationHeatmapRows(quarters: readonly QuarterLike[]): SimulationHeatmapRow[] {
  if (!quarters.length) return [];

  return METRIC_CONFIG.map((metric): SimulationHeatmapRow => {
    const values = quarters.map((quarter) => metric.value(quarter));
    const baseline = values[0] ?? 0;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, EPSILON);
    const deltaRange = Math.max(...values.map((value) => Math.abs(value - baseline)), EPSILON);

    const cells = quarters.map((quarter, index): SimulationHeatmapCell => {
      const value = values[index] ?? 0;
      const normalized = clamp01((value - min) / range);
      const delta = value - baseline;
      const improvementSignal = metric.higherIsBetter ? delta : -delta;
      const status: SimulationHeatmapCell["status"] =
        improvementSignal > 0.05 ? "improve" : improvementSignal < -0.05 ? "worsen" : "flat";
      const intensity = clamp01(0.2 + (Math.abs(delta) / deltaRange) * 0.8);

      return {
        quarter_label: quarter.quarter_label,
        value: round(value, 2),
        normalized: round(normalized, 4),
        intensity: round(intensity, 4),
        status
      };
    });

    return {
      metric_key: metric.key,
      metric_label: metric.label,
      higher_is_better: metric.higherIsBetter,
      cells
    };
  });
}

export function buildModelOutlook(
  quarters: readonly QuarterLike[],
  neglectThreshold = 65
): SimulationModelOutlook {
  if (!quarters.length) {
    return {
      trend: "stable",
      flagged_quarters: 0,
      cleared_quarters: 0,
      unknown_quarters: 0,
      first_below_threshold_quarter: null,
      peak_risk_quarter: null,
      horizon_risk_level: "unknown",
      projected_improvement_pct: 0,
      start_projected_neglect: null,
      horizon_projected_neglect: null
    };
  }

  const projectedSeries = quarters.map((quarter) => quarter.selected_country.projected_neglect);
  const startProjectedNeglect = projectedSeries[0] ?? null;
  const horizonProjectedNeglect = projectedSeries[projectedSeries.length - 1] ?? null;

  const trendDelta =
    startProjectedNeglect !== null && horizonProjectedNeglect !== null
      ? horizonProjectedNeglect - startProjectedNeglect
      : 0;
  const trend: SimulationModelOutlook["trend"] =
    trendDelta <= -1 ? "improving" : trendDelta >= 1 ? "worsening" : "stable";

  const flaggedQuarters = quarters.filter((quarter) => quarter.selected_country.neglect_flag_pred === true).length;
  const clearedQuarters = quarters.filter((quarter) => quarter.selected_country.neglect_flag_pred === false).length;
  const unknownQuarters = Math.max(quarters.length - flaggedQuarters - clearedQuarters, 0);

  const firstBelowThresholdQuarter =
    quarters.find((quarter) => quarter.selected_country.projected_neglect < neglectThreshold)?.quarter_label ?? null;
  const peakRiskQuarter =
    quarters.reduce<{ quarter_label: string; projected_neglect: number } | null>((peak, quarter) => {
      const current = quarter.selected_country.projected_neglect;
      if (!peak || current > peak.projected_neglect) {
        return { quarter_label: quarter.quarter_label, projected_neglect: current };
      }
      return peak;
    }, null)?.quarter_label ?? null;

  const projectedImprovementPct =
    startProjectedNeglect && Number.isFinite(startProjectedNeglect) && startProjectedNeglect > EPSILON
      ? round(((startProjectedNeglect - (horizonProjectedNeglect ?? startProjectedNeglect)) / startProjectedNeglect) * 100, 1)
      : 0;

  return {
    trend,
    flagged_quarters: flaggedQuarters,
    cleared_quarters: clearedQuarters,
    unknown_quarters: unknownQuarters,
    first_below_threshold_quarter: firstBelowThresholdQuarter,
    peak_risk_quarter: peakRiskQuarter,
    horizon_risk_level: toRiskLevel(horizonProjectedNeglect),
    projected_improvement_pct: projectedImprovementPct,
    start_projected_neglect: startProjectedNeglect,
    horizon_projected_neglect: horizonProjectedNeglect
  };
}
