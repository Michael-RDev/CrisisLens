import { NextRequest, NextResponse } from "next/server";
import { runSqlStatement } from "@/lib/databricks";
import { getCrisisTableColumns, getCrisisTableName, pickColumn } from "@/lib/databricks/schema";
import type { MapLayerKey } from "@/lib/services/databricks";

type LayerQuery = {
  layer: MapLayerKey;
};

function parseLayer(request: NextRequest): LayerQuery | null {
  const raw = request.nextUrl.searchParams.get("layer")?.trim().toLowerCase();
  if (raw === "severity") return { layer: "severity" };
  if (raw === "funding_gap") return { layer: "funding_gap" };
  if (raw === "coverage") return { layer: "coverage" };
  if (raw === "oci") return { layer: "oci" };
  return null;
}

function valueExpression(layer: MapLayerKey, columns: Set<string>): string | null {
  if (layer === "severity") {
    const col = pickColumn(columns, ["severity_score"]);
    return col ? `CAST(${col} AS DOUBLE)` : null;
  }

  if (layer === "funding_gap") {
    const col = pickColumn(columns, ["funding_gap_score", "funding_gap_usd", "gap_usd"]);
    return col ? `CAST(${col} AS DOUBLE)` : null;
  }

  if (layer === "oci") {
    const col = pickColumn(columns, ["overlooked_crisis_index", "oci_score"]);
    return col ? `CAST(${col} AS DOUBLE)` : null;
  }

  const coverageCol = pickColumn(columns, ["funding_coverage_pct", "coverage_pct"]);
  if (coverageCol) return `CAST(${coverageCol} AS DOUBLE)`;

  const coverageRatioCol = pickColumn(columns, ["funding_coverage_ratio"]);
  if (coverageRatioCol) return `CAST(${coverageRatioCol} AS DOUBLE) * 100`;

  const fundingCol = pickColumn(columns, ["total_funding_usd", "funding_usd"]);
  const requirementCol = pickColumn(columns, ["total_requirements_usd", "requirements_usd"]);
  if (fundingCol && requirementCol) {
    return `CASE WHEN COALESCE(${requirementCol}, 0) = 0 THEN 0 ELSE (COALESCE(${fundingCol}, 0) / COALESCE(${requirementCol}, 0)) * 100 END`;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const parsed = parseLayer(request);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "layer is required and must be one of severity,funding_gap,coverage,oci." },
      { status: 400 }
    );
  }

  try {
    const table = getCrisisTableName();
    const columns = await getCrisisTableColumns();
    const expr = valueExpression(parsed.layer, columns);

    if (!expr) {
      return NextResponse.json(
        { ok: false, error: `No compatible column mapping found for layer '${parsed.layer}'.` },
        { status: 400 }
      );
    }

    const rows = await runSqlStatement(`
      WITH base AS (
        SELECT
          UPPER(CAST(iso3 AS STRING)) AS iso3,
          CAST(year AS INT) AS year,
          ${expr} AS value
        FROM ${table}
        WHERE iso3 IS NOT NULL
      ), ranked AS (
        SELECT
          iso3,
          value,
          ROW_NUMBER() OVER (
            PARTITION BY iso3
            ORDER BY COALESCE(year, 0) DESC, COALESCE(value, 0) DESC
          ) AS rn
        FROM base
        WHERE value IS NOT NULL
      )
      SELECT
        iso3,
        CAST(value AS DOUBLE) AS value
      FROM ranked
      WHERE rn = 1
    `);

    const data = rows
      .map((row) => ({
        iso3: String(row.iso3 ?? "").trim().toUpperCase(),
        value: Number(row.value ?? 0)
      }))
      .filter((row) => row.iso3.length === 3 && Number.isFinite(row.value));

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load layer values.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
