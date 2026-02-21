import { NextRequest, NextResponse } from "next/server";
import { getDatabricksProvider } from "@/lib/databricks/client";

export async function GET(request: NextRequest) {
  const iso3 = request.nextUrl.searchParams.get("iso3")?.trim().toUpperCase() ?? "";
  if (!iso3 || iso3.length !== 3) {
    return NextResponse.json({ error: "Invalid ISO3 code." }, { status: 400 });
  }

  const provider = getDatabricksProvider();
  const state = await provider.fetchCountryState(iso3);

  if (state) {
    return NextResponse.json(state);
  }

  return NextResponse.json(
    {
      error: "Agent state unavailable. Configure Databricks SQL env vars and verify source table access."
    },
    { status: 503 }
  );
}
