import { describe, expect, it } from "vitest";
import { buildModelOutlook, buildSimulationHeatmapRows } from "@/lib/simulation-viz";

const sampleQuarters = [
  {
    quarter_label: "Q+1",
    selected_country: {
      rank: 14,
      oci: 76.2,
      funding_received: 12_000_000,
      percent_funded: 22.5,
      projected_neglect: 78.6,
      neglect_flag_pred: true
    }
  },
  {
    quarter_label: "Q+2",
    selected_country: {
      rank: 11,
      oci: 71.4,
      funding_received: 18_000_000,
      percent_funded: 33.5,
      projected_neglect: 66.1,
      neglect_flag_pred: null
    }
  },
  {
    quarter_label: "Q+3",
    selected_country: {
      rank: 9,
      oci: 68.7,
      funding_received: 23_000_000,
      percent_funded: 39.7,
      projected_neglect: 61.8,
      neglect_flag_pred: false
    }
  }
] as const;

describe("simulation visualization helpers", () => {
  it("builds quarter heatmap rows with normalized values and directional statuses", () => {
    const rows = buildSimulationHeatmapRows(sampleQuarters);

    expect(rows).toHaveLength(5);
    const ociRow = rows.find((row) => row.metric_key === "oci");
    const fundingRow = rows.find((row) => row.metric_key === "percent_funded");
    const rankRow = rows.find((row) => row.metric_key === "rank");

    expect(ociRow).toBeDefined();
    expect(fundingRow).toBeDefined();
    expect(rankRow).toBeDefined();
    expect(ociRow?.cells).toHaveLength(3);
    expect(fundingRow?.cells).toHaveLength(3);
    expect(rankRow?.cells).toHaveLength(3);

    expect(ociRow?.cells[2]?.status).toBe("improve");
    expect(fundingRow?.cells[2]?.status).toBe("improve");
    expect(rankRow?.cells[2]?.status).toBe("improve");

    for (const row of rows) {
      for (const cell of row.cells) {
        expect(cell.normalized).toBeGreaterThanOrEqual(0);
        expect(cell.normalized).toBeLessThanOrEqual(1);
        expect(cell.intensity).toBeGreaterThanOrEqual(0.2);
        expect(cell.intensity).toBeLessThanOrEqual(1);
      }
    }
  });

  it("summarizes model outlook trend and threshold crossing", () => {
    const outlook = buildModelOutlook(sampleQuarters);

    expect(outlook.trend).toBe("improving");
    expect(outlook.first_below_threshold_quarter).toBe("Q+3");
    expect(outlook.flagged_quarters).toBe(1);
    expect(outlook.cleared_quarters).toBe(1);
    expect(outlook.unknown_quarters).toBe(1);
    expect(outlook.horizon_risk_level).toBe("elevated");
    expect(outlook.projected_improvement_pct).toBeGreaterThan(20);
  });

  it("returns stable defaults when no quarterly data is available", () => {
    const rows = buildSimulationHeatmapRows([]);
    const outlook = buildModelOutlook([]);

    expect(rows).toEqual([]);
    expect(outlook.trend).toBe("stable");
    expect(outlook.first_below_threshold_quarter).toBeNull();
    expect(outlook.flagged_quarters).toBe(0);
    expect(outlook.cleared_quarters).toBe(0);
    expect(outlook.unknown_quarters).toBe(0);
    expect(outlook.horizon_risk_level).toBe("unknown");
    expect(outlook.projected_improvement_pct).toBe(0);
  });
});
