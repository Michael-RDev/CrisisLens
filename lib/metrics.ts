import { CountryMetrics, LayerMode, RiskBand } from "@/lib/types";

export type DerivedCountryMetrics = {
  inNeedPct: number;
  coveragePct: number;
  fundingGap: number;
  fundingGapPct: number;
};

export function clampToPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

export function computeDerivedMetrics(row: CountryMetrics): DerivedCountryMetrics {
  const inNeedPct = row.population > 0 ? (row.inNeed / row.population) * 100 : 0;
  const coveragePct = row.inNeed > 0 ? (row.reached / row.inNeed) * 100 : 0;
  const fundingGap = Math.max(row.fundingRequired - row.fundingReceived, 0);
  const fundingGapPct = row.fundingRequired > 0 ? (fundingGap / row.fundingRequired) * 100 : 0;

  return {
    inNeedPct: clampToPercent(inNeedPct),
    coveragePct: clampToPercent(coveragePct),
    fundingGap,
    fundingGapPct: clampToPercent(fundingGapPct)
  };
}

export function getLayerValue(row: CountryMetrics, mode: LayerMode): number {
  const derived = computeDerivedMetrics(row);
  if (mode === "severity") return clampToPercent(row.severityScore);
  if (mode === "inNeedRate") return derived.inNeedPct;
  if (mode === "fundingGap") return derived.fundingGapPct;
  return derived.coveragePct;
}

export function riskBandFromScore(score: number): RiskBand {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "low";
}
