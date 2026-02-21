import { NextResponse } from "next/server";
import { getCVDetector } from "@/lib/cv/provider";

type CVPayload = {
  imageDataUrl?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as CVPayload;
  if (!payload.imageDataUrl) {
    return NextResponse.json({ error: "imageDataUrl is required." }, { status: 400 });
  }

  const detector = getCVDetector();
  const detection = await detector.detectCountryFromFrame(payload.imageDataUrl);
  return NextResponse.json({
    detection,
    status: detection ? "detected" : "no_match"
  });
}
