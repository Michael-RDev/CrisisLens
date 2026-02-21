import { NextResponse } from "next/server";
import { getGenieClient } from "@/lib/databricks/genie";

type GeniePayload = {
  nl_query?: string;
  iso3?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as GeniePayload;
  const nlQuery = payload.nl_query?.trim();
  if (!nlQuery) {
    return NextResponse.json({ error: "nl_query is required." }, { status: 400 });
  }

  const client = getGenieClient();
  const answer = await client.ask(nlQuery, payload.iso3?.trim().toUpperCase());

  const scopedIso3 = payload.iso3?.trim().toUpperCase();
  const highlightIso3 = scopedIso3 ? [scopedIso3] : [];

  return NextResponse.json({
    nl_query: nlQuery,
    answer: answer.answer,
    source: answer.source ?? "mock",
    results: [
      {
        iso3: scopedIso3 ?? "GLOBAL",
        metric: "coverage_mismatch_index",
        score: 74.2
      }
    ],
    highlight_iso3: highlightIso3
  });
}
