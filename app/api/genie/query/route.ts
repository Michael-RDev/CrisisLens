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
  const highlightIso3 = answer.highlights?.length
    ? answer.highlights
    : scopedIso3
      ? [scopedIso3]
      : [];

  return NextResponse.json({
    nl_query: nlQuery,
    answer: answer.answer,
    source: answer.source ?? "mock",
    results:
      answer.rows?.map((row) => ({
        iso3: row.iso3,
        metric: row.metric,
        score: row.score,
        rationale: row.rationale
      })) ?? [],
    highlight_iso3: highlightIso3
  });
}
