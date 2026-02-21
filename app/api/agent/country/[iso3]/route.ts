import { NextResponse } from "next/server";
import { getDatabricksProvider } from "@/lib/databricks/client";
import { riskBandFromScore } from "@/lib/metrics";

type Params = {
  params: { iso3: string };
};

export async function GET(_: Request, { params }: Params) {
  const iso3 = params.iso3.trim().toUpperCase();
  if (!iso3 || iso3.length !== 3) {
    return NextResponse.json({ error: "Invalid ISO3 code." }, { status: 400 });
  }

  const provider = getDatabricksProvider();
  const state = await provider.fetchCountryState(iso3);

  if (state) {
    return NextResponse.json(state);
  }

  return NextResponse.json({
    iso3,
    narrative: "No Databricks state yet. Connect agent endpoint to hydrate this panel.",
    riskBand: riskBandFromScore(45),
    agentTimestamp: new Date().toISOString(),
    confidence: 0.61,
    riskDrivers: ["No signals available in fallback mode."],
    recommendedActions: ["Connect provider endpoint to replace this fallback response."]
  });
}
