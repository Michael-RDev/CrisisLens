import { describe, expect, it } from "vitest";
import { normalizeIso3, shouldApplyCVDetection } from "@/lib/cv/globeBridge";

describe("cv globe bridge", () => {
  it("normalizes iso3", () => {
    expect(normalizeIso3(" eth ")).toBe("ETH");
  });

  it("validates detection by confidence and iso3", () => {
    expect(
      shouldApplyCVDetection({ iso3: "ETH", confidence: 0.72, frameTimestamp: "2026-02-21T03:00:00Z" })
    ).toBe(true);

    expect(
      shouldApplyCVDetection({ iso3: "E", confidence: 0.99, frameTimestamp: "2026-02-21T03:00:00Z" })
    ).toBe(false);

    expect(
      shouldApplyCVDetection({ iso3: "ETH", confidence: 0.2, frameTimestamp: "2026-02-21T03:00:00Z" })
    ).toBe(false);
  });
});
