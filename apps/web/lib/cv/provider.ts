import { allCountriesSorted, countryByIso3 } from "@/lib/countries";

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
    if (matchedIso && countryByIso3.has(matchedIso)) {
      return {
        iso3: matchedIso,
        confidence: 0.72,
        frameTimestamp: new Date().toISOString()
      };
    }

    const lower = imageDataUrl.toLowerCase();
    const matchedCountry = allCountriesSorted.find((country) =>
      lower.includes(country.name.toLowerCase())
    );
    if (!matchedCountry) return null;

    return {
      iso3: matchedCountry.iso3,
      confidence: 0.72,
      frameTimestamp: new Date().toISOString()
    };
  }
}

export function getCVDetector(): CVCountryDetector {
  return new MockCVCountryDetector();
}
