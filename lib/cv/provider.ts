export type CVDetection = {
  iso3: string;
  confidence: number;
  frameTimestamp: string;
};

export interface CVCountryDetector {
  detectCountryFromFrame(imageDataUrl: string): Promise<CVDetection | null>;
}

export class MockCVCountryDetector implements CVCountryDetector {
  async detectCountryFromFrame(imageDataUrl: string): Promise<CVDetection | null> {
    const upper = imageDataUrl.toUpperCase();
    const matchedIso = upper.match(/\b[A-Z]{3}\b/)?.[0];
    if (!matchedIso) return null;
    return {
      iso3: matchedIso,
      confidence: 0.72,
      frameTimestamp: new Date().toISOString()
    };
  }
}

export function getCVDetector(): CVCountryDetector {
  return new MockCVCountryDetector();
}
