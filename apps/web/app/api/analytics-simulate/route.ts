import { NextResponse } from "next/server";
import { computeOciComponents, rankOverlooked, simulateFundingAllocation } from "@/lib/analytics";
import { loadCountryMetrics } from "@/lib/loadMetrics";
import { clampToPercent } from "@/lib/metrics";

type Body = {
  iso3?: string;
  allocation_usd?: number;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Body | null;
  const iso3 = String(payload?.iso3 ?? "")
    .trim()
    .toUpperCase();
  const allocationUsd = Number(payload?.allocation_usd ?? 0);

  if (!iso3 || iso3.length !== 3) {
    return NextResponse.json({ error: "Invalid iso3." }, { status: 400 });
  }
  if (!Number.isFinite(allocationUsd) || allocationUsd < 0) {
    return NextResponse.json({ error: "Invalid allocation_usd." }, { status: 400 });
  }

  const baseMetrics = await loadCountryMetrics();
  const baseRanked = rankOverlooked(baseMetrics);
  const simulatedMetrics = simulateFundingAllocation(baseMetrics, iso3, allocationUsd);
  const simulatedRanked = rankOverlooked(simulatedMetrics);

  const baseIndex = baseRanked.findIndex((row) => row.iso3 === iso3);
  const simulatedIndex = simulatedRanked.findIndex((row) => row.iso3 === iso3);
  const baseCountry = baseRanked[baseIndex];
  const simulatedCountry = simulatedRanked[simulatedIndex];

  if (!baseCountry || !simulatedCountry) {
    return NextResponse.json({ error: "Country not found in metrics." }, { status: 404 });
  }

  const baseRequired =
    baseCountry.fundingRequired > 0 ? baseCountry.fundingRequired : baseCountry.revisedPlanRequirements;
  const simRequired =
    simulatedCountry.fundingRequired > 0 ? simulatedCountry.fundingRequired : simulatedCountry.revisedPlanRequirements;
  const basePercentFunded =
    baseRequired > 0 ? clampToPercent((baseCountry.fundingReceived / baseRequired) * 100) : baseCountry.percentFunded;
  const simPercentFunded =
    simRequired > 0
      ? clampToPercent((simulatedCountry.fundingReceived / simRequired) * 100)
      : simulatedCountry.percentFunded;

  return NextResponse.json({
    iso3,
    allocation_usd: allocationUsd,
    base: {
      rank: baseIndex + 1,
      oci: computeOciComponents(baseCountry).totalScore,
      funding_received: baseCountry.fundingReceived,
      percent_funded: basePercentFunded
    },
    scenario: {
      rank: simulatedIndex + 1,
      oci: computeOciComponents(simulatedCountry).totalScore,
      funding_received: simulatedCountry.fundingReceived,
      percent_funded: simPercentFunded
    },
    rank_delta: baseIndex - simulatedIndex,
    oci_delta: Number(
      (computeOciComponents(baseCountry).totalScore - computeOciComponents(simulatedCountry).totalScore).toFixed(2)
    ),
    top_overlooked_after: simulatedRanked.slice(0, 12).map((row, index) => ({
      rank: index + 1,
      iso3: row.iso3,
      country: row.country,
      oci_score: computeOciComponents(row).totalScore
    }))
  });
}
