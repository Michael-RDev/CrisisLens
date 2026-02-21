import { NextResponse } from "next/server";
import { loadCountryMetrics } from "@/lib/loadMetrics";
import { computeOciComponents } from "@/lib/analytics";
import { computeDerivedMetrics } from "@/lib/metrics";

export async function GET() {
  const metrics = await loadCountryMetrics();
  const payload = metrics.map((row) => {
    const derived = computeDerivedMetrics(row);
    const oci = computeOciComponents(row);
    return {
      country_iso3: row.iso3,
      fgi_score: Number(derived.fundingGapPct.toFixed(2)),
      cmi_score: Number(((derived.fundingGapPct + Math.max(0, 100 - derived.coveragePct)) / 2).toFixed(2)),
      oci_score: oci.totalScore,
      cbpf_total_usd: row.fundingReceived
    };
  });

  return NextResponse.json(payload);
}
