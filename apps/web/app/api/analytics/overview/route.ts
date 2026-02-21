import { NextResponse } from "next/server";
import { computeOciComponents, rankOverlooked } from "@/lib/analytics";
import { loadCountryMetrics, loadSnapshot } from "@/lib/loadMetrics";
import { computeDerivedMetrics } from "@/lib/metrics";

export async function GET() {
  const [metrics, snapshot] = await Promise.all([loadCountryMetrics(), loadSnapshot()]);
  const ranked = rankOverlooked(metrics);
  const top = ranked.slice(0, 25).map((row, index) => {
    const derived = computeDerivedMetrics(row);
    const oci = computeOciComponents(row);
    return {
      rank: index + 1,
      iso3: row.iso3,
      country: row.country,
      oci_score: oci.totalScore,
      severity_score: row.severityScore,
      in_need_pct: Number(derived.inNeedPct.toFixed(2)),
      funding_gap_pct: Number(derived.fundingGapPct.toFixed(2)),
      coverage_pct: Number(derived.coveragePct.toFixed(2))
    };
  });

  return NextResponse.json({
    generated_at: snapshot.generatedAt,
    formula: {
      severity_component_pct: 32,
      in_need_rate_component_pct: 28,
      funding_gap_component_pct: 22,
      coverage_mismatch_component_pct: 18
    },
    top_overlooked: top
  });
}

