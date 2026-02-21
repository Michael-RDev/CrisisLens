import { allCountriesSorted, countryByIso3 } from "@/lib/countries";
import { RiskBand } from "@/lib/types";

export function getRiskClass(riskBand?: RiskBand): string {
  if (riskBand === "critical") return "chip-critical";
  if (riskBand === "high") return "chip-high";
  if (riskBand === "moderate") return "chip-moderate";
  return "chip-low";
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
