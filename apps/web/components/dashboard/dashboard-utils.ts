import { allCountriesSorted, countryByIso3 } from "@/lib/countries";
import { RiskBand } from "@/lib/types";

export const riskClassByBand: Record<RiskBand, string> = {
  low: "inline-block w-fit rounded-full border border-[var(--chip-low-border)] bg-[var(--chip-low-bg)] px-2.5 py-1 text-xs uppercase tracking-[0.03em] text-[var(--chip-low-text)]",
  moderate:
    "inline-block w-fit rounded-full border border-[var(--chip-moderate-border)] bg-[var(--chip-moderate-bg)] px-2.5 py-1 text-xs uppercase tracking-[0.03em] text-[var(--chip-moderate-text)]",
  high: "inline-block w-fit rounded-full border border-[var(--chip-high-border)] bg-[var(--chip-high-bg)] px-2.5 py-1 text-xs uppercase tracking-[0.03em] text-[var(--chip-high-text)]",
  critical:
    "inline-block w-fit rounded-full border border-[var(--chip-critical-border)] bg-[var(--chip-critical-bg)] px-2.5 py-1 text-xs uppercase tracking-[0.03em] text-[var(--chip-critical-text)]"
};

export function getRiskClass(riskBand?: RiskBand): string {
  if (!riskBand) return riskClassByBand.low;
  return riskClassByBand[riskBand];
}

export function getOutlierLabel(flag: "low" | "high" | "none"): string {
  if (flag === "high") return "High BBR outlier";
  if (flag === "low") return "Low BBR outlier";
  return "Within range";
}

export function getCountrySuggestions(): string[] {
  return allCountriesSorted.map((row) => row.name);
}

export function resolveJumpToCountryIso3(rawQuery: string): string | null {
  const raw = rawQuery.trim();
  const isoFromLabel = raw.match(/\(([A-Za-z]{3})\)$/)?.[1]?.toUpperCase();
  if (isoFromLabel && countryByIso3.has(isoFromLabel)) {
    return isoFromLabel;
  }

  const needle = raw.toLowerCase();
  if (!needle) return null;

  const exactIso = allCountriesSorted.find((item) => item.iso3.toLowerCase() === needle);
  if (exactIso) {
    return exactIso.iso3;
  }

  const nameMatch = allCountriesSorted.find((item) => item.name.toLowerCase().includes(needle));
  if (nameMatch) {
    return nameMatch.iso3;
  }

  return null;
}
