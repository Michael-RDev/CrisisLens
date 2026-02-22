type ArcCoordinates = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

type ArcGeometryInput = ArcCoordinates & {
  magnitude?: number;
};

function clampRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Great-circle distance in radians.
 */
export function greatCircleDistanceRadians(coords: ArcCoordinates): number {
  const lat1 = toRadians(coords.startLat);
  const lat2 = toRadians(coords.endLat);
  const dLat = lat2 - lat1;
  const dLng = toRadians(coords.endLng - coords.startLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(1 - a, 0)));
  return clampRange(c, 0, Math.PI);
}

/**
 * Auto-scale used by react-globe.gl to keep links wrapped around the globe.
 */
export function arcAltitudeAutoScale(input: ArcGeometryInput): number {
  const distanceRatio = greatCircleDistanceRadians(input) / Math.PI;
  const magnitudeBoost = clampRange((input.magnitude ?? 0) / 8, 0, 1);
  return Number((0.45 + distanceRatio * 0.4 + magnitudeBoost * 0.18).toFixed(3));
}

export function arcStrokeWidth(input: ArcGeometryInput): number {
  const distanceRatio = greatCircleDistanceRadians(input) / Math.PI;
  const magnitude = Math.max(input.magnitude ?? 0, 0);
  return Number(Math.min(2.4, 0.45 + magnitude * 0.16 + distanceRatio * 0.55).toFixed(3));
}

