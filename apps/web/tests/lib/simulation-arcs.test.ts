import { describe, expect, it } from "vitest";
import { buildSimulationImpactArcs } from "@/lib/globe/simulation-arcs";

describe("simulation impact arcs", () => {
  it("builds elevated great-circle arc links from impact arrows", () => {
    const arcs = buildSimulationImpactArcs([
      {
        from_iso3: "SDN",
        to_iso3: "ETH",
        country: "Ethiopia",
        direction: "pressure",
        relation: "still_ahead",
        rank_delta: 2,
        overall_score_delta: 1.42,
        projected_neglect_delta: 2.25,
        magnitude: 3.8
      }
    ]);

    expect(arcs).toHaveLength(1);
    expect(arcs[0].start_lat).toBeTypeOf("number");
    expect(arcs[0].end_lng).toBeTypeOf("number");
    expect(arcs[0].altitude_auto_scale).toBeGreaterThanOrEqual(0.45);
    expect(arcs[0].stroke_width).toBeGreaterThan(0.4);
  });

  it("filters arrows where either endpoint lacks country coordinates", () => {
    const arcs = buildSimulationImpactArcs([
      {
        from_iso3: "ZZZ",
        to_iso3: "ETH",
        country: "Ethiopia",
        direction: "pressure",
        relation: "still_ahead",
        rank_delta: 1,
        overall_score_delta: 0.6,
        projected_neglect_delta: 0.8,
        magnitude: 1.5
      }
    ]);

    expect(arcs).toHaveLength(0);
  });

  it("widens the arc stroke as impact magnitude increases", () => {
    const arcs = buildSimulationImpactArcs([
      {
        from_iso3: "SDN",
        to_iso3: "ETH",
        country: "Ethiopia",
        direction: "relief",
        relation: "shifted",
        rank_delta: 0,
        overall_score_delta: -0.35,
        projected_neglect_delta: -0.5,
        magnitude: 0.8
      },
      {
        from_iso3: "SDN",
        to_iso3: "TCD",
        country: "Chad",
        direction: "pressure",
        relation: "still_ahead",
        rank_delta: 3,
        overall_score_delta: 2.1,
        projected_neglect_delta: 2.7,
        magnitude: 5.2
      }
    ]);

    expect(arcs).toHaveLength(2);
    expect(arcs[1].stroke_width).toBeGreaterThan(arcs[0].stroke_width);
  });
});
