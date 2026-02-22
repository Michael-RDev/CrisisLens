import { countryByIso3 } from "@/lib/countries";
import { arcAltitudeAutoScale, arcStrokeWidth } from "@/lib/globe/arcs";

export type SimulationImpactArrowInput = {
  from_iso3: string;
  to_iso3: string;
  country: string;
  direction: "pressure" | "relief" | "neutral";
  relation: "still_ahead" | "new_ahead" | "overtaken" | "behind_buffer" | "shifted";
  rank_delta: number;
  overall_score_delta: number;
  projected_neglect_delta: number;
  magnitude: number;
};

export type SimulationImpactArc = SimulationImpactArrowInput & {
  id: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  altitude_auto_scale: number;
  stroke_width: number;
  color: string;
  label: string;
  dash_initial_gap: number;
  animation_ms: number;
};

function directionColor(direction: SimulationImpactArrowInput["direction"]): string {
  if (direction === "pressure") return "#ef4444";
  if (direction === "relief") return "#22c55e";
  return "#cbd5e1";
}

function formatSigned(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}`;
}

export function buildSimulationImpactArcs(
  arrows: SimulationImpactArrowInput[]
): SimulationImpactArc[] {
  if (!Array.isArray(arrows) || arrows.length === 0) return [];

  return arrows
    .map((arrow, index): SimulationImpactArc | null => {
      const from = countryByIso3.get(arrow.from_iso3);
      const to = countryByIso3.get(arrow.to_iso3);
      if (!from?.latlng || !to?.latlng) return null;

      const [startLat, startLng] = from.latlng;
      const [endLat, endLng] = to.latlng;
      const altitudeAutoScale = arcAltitudeAutoScale({
        startLat,
        startLng,
        endLat,
        endLng,
        magnitude: arrow.magnitude
      });
      const strokeWidth = arcStrokeWidth({
        startLat,
        startLng,
        endLat,
        endLng,
        magnitude: arrow.magnitude
      });

      return {
        ...arrow,
        id: `${arrow.from_iso3}-${arrow.to_iso3}-${index}`,
        start_lat: startLat,
        start_lng: startLng,
        end_lat: endLat,
        end_lng: endLng,
        altitude_auto_scale: altitudeAutoScale,
        stroke_width: strokeWidth,
        color: directionColor(arrow.direction),
        label: `${arrow.country} • OCI ${formatSigned(arrow.overall_score_delta)} • Neglect ${formatSigned(
          arrow.projected_neglect_delta
        )} • Rank ${arrow.rank_delta > 0 ? "+" : ""}${arrow.rank_delta}`,
        dash_initial_gap: Number((index * 0.35).toFixed(2)),
        animation_ms: Math.round(Math.max(1100, 1700 - Math.min(arrow.magnitude, 8) * 95))
      };
    })
    .filter((arc): arc is SimulationImpactArc => Boolean(arc));
}
