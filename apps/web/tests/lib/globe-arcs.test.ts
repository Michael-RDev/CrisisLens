import { describe, expect, it } from "vitest";
import { arcAltitudeAutoScale, arcStrokeWidth, greatCircleDistanceRadians } from "@/lib/globe/arcs";

describe("globe arc helpers", () => {
  it("increases distance for farther country pairs", () => {
    const shortDistance = greatCircleDistanceRadians({
      startLat: 0,
      startLng: 0,
      endLat: 6,
      endLng: 8
    });
    const longDistance = greatCircleDistanceRadians({
      startLat: 0,
      startLng: 0,
      endLat: 0,
      endLng: 170
    });

    expect(longDistance).toBeGreaterThan(shortDistance);
  });

  it("uses larger auto-scale values for long-haul and high-magnitude links", () => {
    const shortLowImpact = arcAltitudeAutoScale({
      startLat: 2,
      startLng: 6,
      endLat: 8,
      endLng: 11,
      magnitude: 0.5
    });
    const longHighImpact = arcAltitudeAutoScale({
      startLat: 12,
      startLng: -30,
      endLat: -8,
      endLng: 150,
      magnitude: 6
    });

    expect(shortLowImpact).toBeGreaterThanOrEqual(0.45);
    expect(longHighImpact).toBeGreaterThan(shortLowImpact);
  });

  it("widens stroke width as impact magnitude increases", () => {
    const small = arcStrokeWidth({
      startLat: 10,
      startLng: 20,
      endLat: 15,
      endLng: 25,
      magnitude: 1
    });
    const large = arcStrokeWidth({
      startLat: 10,
      startLng: 20,
      endLat: 15,
      endLng: 25,
      magnitude: 6
    });

    expect(large).toBeGreaterThan(small);
  });
});
