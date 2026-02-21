import { CountryMetrics } from "@/lib/types";

export function formatCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function computeGlobalSummary(metrics: CountryMetrics[]) {
  const totals = metrics.reduce(
    (acc, row) => {
      acc.population += row.population;
      acc.inNeed += row.inNeed;
      acc.fundingRequired += row.fundingRequired;
      acc.fundingReceived += row.fundingReceived;
      return acc;
    },
    { population: 0, inNeed: 0, fundingRequired: 0, fundingReceived: 0 }
  );

  const fundingGap = Math.max(totals.fundingRequired - totals.fundingReceived, 0);
  const fundedPct =
    totals.fundingRequired > 0
      ? (totals.fundingReceived / totals.fundingRequired) * 100
      : 0;

  return {
    ...totals,
    fundingGap,
    fundedPct
  };
}
