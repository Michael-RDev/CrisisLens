import { CVDetection } from "@/lib/cv/provider";

export type CVPointerEvent = {
  normX: number;
  normY: number;
  confidence: number;
  timestamp: string;
};

export function shouldApplyCVDetection(detection: CVDetection | null, minConfidence = 0.65): boolean {
  return Boolean(detection && detection.confidence >= minConfidence && detection.iso3.length === 3);
}

export function normalizeIso3(iso3: string): string {
  return iso3.trim().toUpperCase();
}
