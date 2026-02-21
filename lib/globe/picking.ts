type PickableObject = {
  parent?: unknown;
  __globeObjType?: string;
  __data?: unknown;
};

type IntersectionLike = {
  object: unknown;
};

type PolygonData = {
  properties?: {
    iso3?: string;
  };
};

function asPickableObject(value: unknown): PickableObject | null {
  return value && typeof value === "object" ? (value as PickableObject) : null;
}

export function polygonDataFromObject(obj: unknown): PolygonData | null {
  let current = asPickableObject(obj);
  while (current) {
    if (current.__globeObjType === "polygon" && current.__data) {
      return current.__data as PolygonData;
    }
    current = asPickableObject(current.parent);
  }
  return null;
}

export function iso3FromIntersections(intersections: IntersectionLike[]): string | null {
  for (const intersection of intersections) {
    const polygonData = polygonDataFromObject(intersection.object);
    const iso3 = polygonData?.properties?.iso3;
    if (iso3 && iso3.length === 3) {
      return iso3;
    }
  }
  return null;
}
