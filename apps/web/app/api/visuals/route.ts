import { NextRequest, NextResponse } from "next/server";
import { runSqlStatement } from "@/lib/databricks";
import { getCrisisTableColumns, getCrisisTableName, pickColumn } from "@/lib/databricks/schema";
import type { VisualMetricKey } from "@/lib/services/databricks";

type ParsedRequest = {
  iso3: string;
  metric: VisualMetricKey;
  limit: number;
};

function parseRequest(request: NextRequest): ParsedRequest | null {
  const iso3 = request.nextUrl.searchParams.get("iso3")?.trim().toUpperCase() ?? "";
  const metric = request.nextUrl.searchParams.get("metric")?.trim().toLowerCase() ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 12);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.round(limitParam), 3), 40) : 12;

  if (!/^[A-Z]{3}$/.test(iso3)) return null;

  if (
    metric !== "coverage_trend" &&
    metric !== "funding_gap_per_person_trend" &&
    metric !== "severity_trend" &&
    metric !== "oci_trend" &&
    metric !== "people_in_need_trend"
  ) {
    return null;
  }

  return {
    iso3,
    metric: metric as VisualMetricKey,
    limit
  };
}

function metricExpression(metric: VisualMetricKey, columns: Set<string>): { expr: string; unit: string } | null {
  if (metric === "coverage_trend") {
    const coverageCol = pickColumn(columns, ["funding_coverage_pct", "coverage_pct"]);
    if (coverageCol) return { expr: `CAST(${coverageCol} AS DOUBLE)`, unit: "%" };

    const ratioCol = pickColumn(columns, ["funding_coverage_ratio"]);
    if (ratioCol) return { expr: `CAST(${ratioCol} AS DOUBLE) * 100`, unit: "%" };

    const fundingCol = pickColumn(columns, ["total_funding_usd", "funding_usd"]);
    const requirementsCol = pickColumn(columns, ["total_requirements_usd", "requirements_usd"]);
    if (fundingCol && requirementsCol) {
      return {
        expr: `CASE WHEN COALESCE(${requirementsCol}, 0) = 0 THEN 0 ELSE (COALESCE(${fundingCol}, 0) / COALESCE(${requirementsCol}, 0)) * 100 END`,
        unit: "%"
      };
    }
    return null;
  }

  if (metric === "funding_gap_per_person_trend") {
    const gapPerCol = pickColumn(columns, ["funding_gap_per_person_usd", "funding_gap_per_person"]);
    if (gapPerCol) return { expr: `CAST(${gapPerCol} AS DOUBLE)`, unit: "USD" };

    const gapCol = pickColumn(columns, ["funding_gap_usd", "gap_usd"]);
    const pinCol = pickColumn(columns, ["total_people_in_need", "people_in_need"]);
    if (gapCol && pinCol) {
      return {
        expr: `CASE WHEN COALESCE(${pinCol}, 0) = 0 THEN 0 ELSE COALESCE(${gapCol}, 0) / COALESCE(${pinCol}, 0) END`,
        unit: "USD"
      };
    }
    return null;
  }

  if (metric === "severity_trend") {
    const severityCol = pickColumn(columns, ["severity_score"]);
    return severityCol ? { expr: `CAST(${severityCol} AS DOUBLE)`, unit: "score" } : null;
  }

  if (metric === "oci_trend") {
    const ociCol = pickColumn(columns, ["overlooked_crisis_index", "oci_score"]);
    return ociCol ? { expr: `CAST(${ociCol} AS DOUBLE)`, unit: "score" } : null;
  }

  const pinCol = pickColumn(columns, ["total_people_in_need", "people_in_need"]);
  return pinCol ? { expr: `CAST(${pinCol} AS DOUBLE)`, unit: "people" } : null;
}

export async function GET(request: NextRequest) {
  const parsed = parseRequest(request);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "iso3 and metric are required. metric must be a supported visual key." },
      { status: 400 }
    );
  }

  try {
    const table = getCrisisTableName();
    const columns = await getCrisisTableColumns();
    const metric = metricExpression(parsed.metric, columns);

    if (!metric) {
      return NextResponse.json(
        { ok: false, error: `No compatible schema mapping found for metric '${parsed.metric}'.` },
        { status: 400 }
      );
    }

    const rows = await runSqlStatement(
      `
      SELECT
        CAST(year AS INT) AS year,
        ${metric.expr} AS value
      FROM ${table}
      WHERE UPPER(CAST(iso3 AS STRING)) = :iso3
        AND year IS NOT NULL
      ORDER BY CAST(year AS INT) ASC
      LIMIT ${parsed.limit}
      `,
      { iso3: parsed.iso3 }
    );

    const data = rows
      .map((row) => ({
        year: Math.round(Number(row.year ?? 0)),
        value: Number(row.value ?? 0)
      }))
      .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.value));

    return NextResponse.json({
      ok: true,
      data: {
        iso3: parsed.iso3,
        metric: parsed.metric,
        labels: data.map((row) => String(row.year)),
        values: data.map((row) => row.value),
        updatedAt: new Date().toISOString(),
        unit: metric.unit
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load visuals.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
