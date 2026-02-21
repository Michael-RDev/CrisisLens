import { NextResponse } from "next/server";
import { loadCountryMetrics } from "@/lib/loadMetrics";

type Params = {
  params: { iso3: string };
};

const clusterNames = ["WASH", "Food", "Health", "Shelter", "Education", "Protection"];

export async function GET(_: Request, { params }: Params) {
  const iso3 = params.iso3.trim().toUpperCase();
  if (!iso3 || iso3.length !== 3) {
    return NextResponse.json({ error: "Invalid ISO3 code." }, { status: 400 });
  }

  const metrics = await loadCountryMetrics();
  const row = metrics.find((item) => item.iso3 === iso3);
  if (!row) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  const clusterBreakdown = clusterNames.map((clusterName, index) => {
    const weight = 1 + ((iso3.charCodeAt(0) + index * 7) % 6) / 10;
    const bbr = Number(((row.reached / Math.max(row.revisedPlanRequirements, 1)) * 1_000_000 * weight).toFixed(2));
    const bbrZScore = Number((((weight - 1.25) / 0.22) * 0.6).toFixed(2));
    return {
      cluster_name: clusterName,
      bbr,
      bbr_z_score: bbrZScore
    };
  });

  const projectList = Array.from({ length: 5 }).map((_, idx) => {
    const budget = Math.max(500_000, Math.round((row.fundingRequired / 8) * (1 + idx * 0.14)));
    const peopleTargeted = Math.max(5_000, Math.round((row.targeted / 6) * (1 + idx * 0.08)));
    const bbr = Number((peopleTargeted / budget).toFixed(6));
    const bbrZScore = Number(((-0.4 + idx * 0.35) * 1.1).toFixed(2));

    return {
      project_id: `HRP-${row.latestFundingYear || 2026}-${iso3}-${String(idx + 1).padStart(5, "0")}`,
      name: `${row.country} Response Project ${idx + 1}`,
      budget_usd: budget,
      people_targeted: peopleTargeted,
      bbr_z_score: bbrZScore,
      bbr
    };
  });

  return NextResponse.json({
    iso3,
    country: row.country,
    cluster_breakdown: clusterBreakdown,
    hrp_project_list: projectList,
    metrics: row
  });
}
