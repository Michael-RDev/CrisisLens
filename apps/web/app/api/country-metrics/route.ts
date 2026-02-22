import { NextResponse } from "next/server";
import { buildInsightMetrics, resolveCountryIso3 } from "@/lib/country-insights";
import { loadCountryMetrics } from "@/lib/loadMetrics";

type Payload = {
  countryCode?: string;
};

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const countryCode = payload.countryCode?.trim();
  if (!countryCode) {
    return NextResponse.json({ error: "countryCode is required." }, { status: 400 });
  }

  const iso3 = resolveCountryIso3(countryCode);
  if (!iso3) {
    return NextResponse.json({ error: "Unknown countryCode. Use ISO3 or ISO2." }, { status: 400 });
  }

  const metrics = await loadCountryMetrics();

  try {
    const insight = buildInsightMetrics(iso3, metrics);
    return NextResponse.json(insight);
  } catch {
    return NextResponse.json(
      {
        error: `No metrics found for ${iso3}.`
      },
      { status: 404 }
    );
  }
}
