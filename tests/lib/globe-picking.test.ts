import { describe, expect, it } from "vitest";
import { iso3FromIntersections, polygonDataFromObject } from "@/lib/globe/picking";

describe("globe picking helpers", () => {
  it("finds polygon data by walking parents", () => {
    const polygonNode = {
      __globeObjType: "polygon",
      __data: { properties: { iso3: "ETH" } },
      parent: null
    };
    const child = { parent: polygonNode };
    expect(polygonDataFromObject(child)?.properties?.iso3).toBe("ETH");
  });

  it("returns first iso3 from mixed intersections", () => {
    const nonPolygon = { __globeObjType: "globe", parent: null };
    const polygon = {
      __globeObjType: "polygon",
      __data: { properties: { iso3: "SDN" } },
      parent: null
    };

    const intersections = [{ object: nonPolygon }, { object: { parent: polygon } }];
    expect(iso3FromIntersections(intersections)).toBe("SDN");
  });

  it("returns null when no polygon iso exists", () => {
    expect(iso3FromIntersections([{ object: { parent: null } }])).toBeNull();
  });
});
