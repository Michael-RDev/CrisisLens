import { NextResponse } from "next/server";
import { mapGeoError, runGeoStrategicQuery } from "@/lib/geo-query";

type Payload = {
  question?: string;
};

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const question = payload.question?.trim();
  if (!question) {
    return NextResponse.json({ ok: false, error: "question is required." }, { status: 400 });
  }

  try {
    const data = await runGeoStrategicQuery(question);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const mapped = mapGeoError(error);
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
  }
}
