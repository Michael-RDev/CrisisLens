import { NextResponse } from "next/server";
import { loadCountryMetrics } from "@/lib/loadMetrics";
import { buildQuarterlySimulation } from "@/lib/simulation";

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

  const metrics = await loadCountryMetrics();
  try {
    const simulation = buildQuarterlySimulation(metrics, iso3, allocationUsd);
    const selectedMetrics = metrics.find((row) => row.iso3 === iso3);
    const projectionPoints = Array.isArray(selectedMetrics?.futureProjections)
      ? selectedMetrics.futureProjections.length
      : 0;
    const usesNeglectFlag = Boolean(
      selectedMetrics?.futureProjections?.some((projection) => typeof projection.neglectFlagPred === "boolean")
    );

    return NextResponse.json({
      ...simulation,
      ml_context: {
        source_path: "apps/ml/models/artifacts/gold_country_scores.json",
        projection_points: projectionPoints,
        uses_neglect_flag: usesNeglectFlag
      }
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Failed to run simulation.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
