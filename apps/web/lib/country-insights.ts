import { rankOverlooked } from "@/lib/analytics";
import { countryByIso3, iso3ByIso2 } from "@/lib/countries";
import { computeDerivedMetrics } from "@/lib/metrics";
import { CountryMetrics } from "@/lib/types";

export type CountryInsightMetrics = {
  countryCode: string;
  countryName: string;
  cards: {
    pin: number;
    funding: number;
    pinFundingRatio: number | null;
    rank: number;
  };
  details: {
    percentFunded: number;
    fundingRequired: number;
    inNeedRate: number;
    fundingGapPct: number;
    coveragePct: number;
    severityScore: number;
    latestFundingYear: number;
  };
  chart: Array<{ label: string; value: number }>;
};

export function resolveCountryIso3(countryCode: string): string | null {
  const normalized = countryCode.trim().toUpperCase();
  if (!normalized) return null;

  if (normalized.length === 3) {
    return countryByIso3.has(normalized) ? normalized : null;
  }

  if (normalized.length === 2) {
    return iso3ByIso2.get(normalized) ?? null;
  }

  return null;
}

export function buildInsightMetrics(
  iso3: string,
  allMetrics: CountryMetrics[]
): CountryInsightMetrics {
  const row = allMetrics.find((item) => item.iso3 === iso3);
  if (!row) {
    throw new Error("Country metrics not found.");
  }

  const ranked = rankOverlooked(allMetrics);
  const rank = ranked.findIndex((item) => item.iso3 === iso3) + 1;
  const derived = computeDerivedMetrics(row);

  const pinFundingRatio = row.fundingReceived > 0 ? row.inNeed / row.fundingReceived : null;

  return {
    countryCode: row.iso3,
    countryName: row.country,
    cards: {
      pin: row.inNeed,
      funding: row.fundingReceived,
      pinFundingRatio: pinFundingRatio !== null ? Number(pinFundingRatio.toFixed(4)) : null,
      rank: rank > 0 ? rank : 0
    },
    details: {
      percentFunded: row.percentFunded,
      fundingRequired: row.fundingRequired,
      inNeedRate: Number(derived.inNeedPct.toFixed(2)),
      fundingGapPct: Number(derived.fundingGapPct.toFixed(2)),
      coveragePct: Number(derived.coveragePct.toFixed(2)),
      severityScore: Number(row.severityScore.toFixed(2)),
      latestFundingYear: row.latestFundingYear
    },
    chart: [
      { label: "People In Need", value: row.inNeed },
      { label: "People Reached", value: row.reached },
      { label: "Funding Required", value: row.fundingRequired },
      { label: "Funding Received", value: row.fundingReceived }
    ]
  };
}
