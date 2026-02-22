import { NextRequest, NextResponse } from "next/server";
import { computeOciComponents } from "@/lib/analytics";
import { runSqlStatement } from "@/lib/databricks";
import { getCrisisTableColumns, getCrisisTableName, pickColumn } from "@/lib/databricks/schema";
import { loadCountryMetrics, loadProjectProfiles } from "@/lib/loadMetrics";
import type { CountrySummary } from "@/lib/services/databricks";

function toNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function inferRiskLabel(ociScore: number | null): string {
  if (ociScore === null) return "Risk level unavailable";
  if (ociScore >= 75) return "CRITICAL - Severely Overlooked";
  if (ociScore >= 50) return "HIGH - Significantly Overlooked";
  if (ociScore >= 30) return "MODERATE - Partially Overlooked";
  return "LOW - Adequately Covered";
}

function inferFundingAdequacy(coveragePct: number | null, riskLabel: string): string {
  if (coveragePct !== null) {
    if (coveragePct >= 80) return "Adequately funded";
    if (coveragePct >= 40) return "Partially funded";
    return "Underfunded";
  }
  if (riskLabel.toLowerCase().includes("adequately covered")) return "Adequately funded";
  return "Unknown";
}

function nullableColumnExpr(column: string | null): string {
  return column ? `CAST(${column} AS DOUBLE)` : "NULL";
}

async function fetchDatabricksCountrySummary(iso3: string): Promise<CountrySummary | null> {
  const table = getCrisisTableName();
  const columns = await getCrisisTableColumns();

  const yearColumn = pickColumn(columns, ["year"]);
  const countryColumn = pickColumn(columns, ["country_plan_name", "country", "country_name"]);
  const riskColumn = pickColumn(columns, ["crisis_status", "risk_label", "status"]);
  const ociColumn = pickColumn(columns, ["overlooked_crisis_index", "oci_score"]);
  const severityColumn = pickColumn(columns, ["severity_score"]);
  const peopleInNeedColumn = pickColumn(columns, ["total_people_in_need", "people_in_need"]);
  const fundingColumn = pickColumn(columns, ["total_funding_usd", "funding_usd"]);
  const requirementsColumn = pickColumn(columns, ["total_requirements_usd", "requirements_usd"]);
  const fundingGapColumn = pickColumn(columns, ["funding_gap_usd", "gap_usd"]);
  const gapPerPersonColumn = pickColumn(columns, ["funding_gap_per_person_usd", "funding_gap_per_person"]);
  const coveragePctColumn = pickColumn(columns, ["funding_coverage_pct", "coverage_pct"]);
  const coverageRatioColumn = pickColumn(columns, ["funding_coverage_ratio"]);

  const fundingExpr = nullableColumnExpr(fundingColumn);
  const requirementsExpr = nullableColumnExpr(requirementsColumn);
  const peopleInNeedExpr = nullableColumnExpr(peopleInNeedColumn);

  const fundingGapExpr =
    fundingGapColumn
      ? `CAST(${fundingGapColumn} AS DOUBLE)`
      : fundingColumn && requirementsColumn
        ? `GREATEST(COALESCE(${requirementsColumn}, 0) - COALESCE(${fundingColumn}, 0), 0)`
        : "NULL";

  const coverageExpr = coveragePctColumn
    ? `CAST(${coveragePctColumn} AS DOUBLE)`
    : coverageRatioColumn
      ? `CAST(${coverageRatioColumn} AS DOUBLE) * 100`
      : fundingColumn && requirementsColumn
        ? `CASE
             WHEN COALESCE(${requirementsColumn}, 0) = 0 THEN 0
             ELSE (COALESCE(${fundingColumn}, 0) / COALESCE(${requirementsColumn}, 0)) * 100
           END`
        : "NULL";

  const gapPerPersonExpr = gapPerPersonColumn
    ? `CAST(${gapPerPersonColumn} AS DOUBLE)`
    : peopleInNeedColumn
      ? `CASE
           WHEN COALESCE(${peopleInNeedColumn}, 0) = 0 THEN NULL
           ELSE (${fundingGapExpr}) / COALESCE(${peopleInNeedColumn}, 0)
         END`
      : "NULL";

  const yearExpr = yearColumn ? `CAST(${yearColumn} AS INT)` : "0";
  const countryExpr = countryColumn ? `CAST(${countryColumn} AS STRING)` : "CAST(iso3 AS STRING)";
  const riskExpr = riskColumn ? `CAST(${riskColumn} AS STRING)` : "NULL";
  const sortExpr = yearColumn ? `COALESCE(CAST(${yearColumn} AS INT), 0)` : "0";

  const rows = await runSqlStatement(
    `
      SELECT
        UPPER(CAST(iso3 AS STRING)) AS iso3,
        ${yearExpr} AS year,
        ${countryExpr} AS country,
        ${riskExpr} AS risk_label,
        ${nullableColumnExpr(ociColumn)} AS oci_score,
        ${nullableColumnExpr(severityColumn)} AS severity_score,
        ${coverageExpr} AS coverage_pct,
        ${gapPerPersonExpr} AS gap_per_person_usd,
        ${peopleInNeedExpr} AS people_in_need,
        ${fundingGapExpr} AS funding_gap_usd,
        ${fundingExpr} AS funding_usd,
        ${requirementsExpr} AS requirements_usd
      FROM ${table}
      WHERE UPPER(CAST(iso3 AS STRING)) = :iso3
      ORDER BY ${sortExpr} DESC
      LIMIT 1
    `,
    { iso3 }
  );

  const row = rows[0];
  if (!row) return null;

  const coveragePct = toNullableNumber(row.coverage_pct);
  const peopleInNeed = toNullableNumber(row.people_in_need);
  const fundingGapUsd = toNullableNumber(row.funding_gap_usd);
  const fundingUsd = toNullableNumber(row.funding_usd);
  const requirementsUsd = toNullableNumber(row.requirements_usd);
  const ociScore = toNullableNumber(row.oci_score);
  const severityScore = toNullableNumber(row.severity_score);

  const derivedFundingGap =
    fundingGapUsd ?? (fundingUsd !== null && requirementsUsd !== null ? Math.max(requirementsUsd - fundingUsd, 0) : null);
  const derivedGapPerPerson =
    toNullableNumber(row.gap_per_person_usd) ??
    (derivedFundingGap !== null && peopleInNeed && peopleInNeed > 0 ? derivedFundingGap / peopleInNeed : null);

  const rawRiskLabel = toText(row.risk_label);
  const riskLabel = rawRiskLabel || inferRiskLabel(ociScore);
  const missingMetrics: string[] = [];
  if (derivedGapPerPerson === null) missingMetrics.push("gap_per_person");
  if (peopleInNeed === null) missingMetrics.push("people_in_need");
  if (severityScore === null) missingMetrics.push("severity_score");

  return {
    iso3,
    country: toText(row.country) || iso3,
    year: Math.round(toNullableNumber(row.year) ?? 0),
    riskLabel,
    coveragePct,
    gapPerPersonUsd: derivedGapPerPerson,
    peopleInNeed,
    ociScore,
    severityScore,
    fundingAdequacy: inferFundingAdequacy(coveragePct, riskLabel),
    fundingGapUsd: derivedFundingGap,
    fundingUsd,
    requirementsUsd,
    missingMetrics
  };
}

async function handleLegacyCountryDrilldown(iso3: string) {
  const [metrics, projects] = await Promise.all([loadCountryMetrics(), loadProjectProfiles()]);
  const row = metrics.find((item) => item.iso3 === iso3);
  if (!row) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  const countryProjects = projects.filter((item) => item.iso3 === iso3);
  const clusterMap = new Map<
    string,
    {
      cluster_name: string;
      bbr_sum: number;
      bbr_z_score_abs_max: number;
      count: number;
      budget_usd: number;
      people_targeted: number;
    }
  >();

  countryProjects.forEach((project) => {
    const current = clusterMap.get(project.cluster_name) ?? {
      cluster_name: project.cluster_name,
      bbr_sum: 0,
      bbr_z_score_abs_max: 0,
      count: 0,
      budget_usd: 0,
      people_targeted: 0
    };
    current.bbr_sum += project.bbr;
    current.bbr_z_score_abs_max = Math.max(current.bbr_z_score_abs_max, Math.abs(project.bbr_z_score));
    current.count += 1;
    current.budget_usd += project.budget_usd;
    current.people_targeted += project.people_targeted;
    clusterMap.set(project.cluster_name, current);
  });

  const clusterBreakdown = [...clusterMap.values()]
    .map((cluster) => ({
      cluster_name: cluster.cluster_name,
      bbr: Number((cluster.bbr_sum / Math.max(cluster.count, 1)).toFixed(8)),
      bbr_z_score: Number(cluster.bbr_z_score_abs_max.toFixed(2)),
      budget_usd: Math.round(cluster.budget_usd),
      people_targeted: Math.round(cluster.people_targeted)
    }))
    .sort((a, b) => b.bbr_z_score - a.bbr_z_score);

  const projectList = countryProjects
    .map((project) => ({
      project_id: project.project_id,
      name: project.name,
      cluster_name: project.cluster_name,
      budget_usd: project.budget_usd,
      people_targeted: project.people_targeted,
      bbr: project.bbr,
      bbr_z_score: project.bbr_z_score,
      outlier_flag: project.outlier_flag
    }))
    .sort((a, b) => Math.abs(b.bbr_z_score) - Math.abs(a.bbr_z_score));

  const outlierProjects = projectList
    .filter((project) => Math.abs(project.bbr_z_score) >= 1.8)
    .slice(0, 12);

  return NextResponse.json({
    iso3,
    country: row.country,
    oci: computeOciComponents(row),
    cluster_breakdown: clusterBreakdown,
    outlier_projects: outlierProjects,
    hrp_project_list: projectList.slice(0, 20),
    metrics: row
  });
}

export async function GET(request: NextRequest) {
  const iso3 = request.nextUrl.searchParams.get("iso3")?.trim().toUpperCase() ?? "";
  if (!iso3 || iso3.length !== 3) {
    return NextResponse.json({ error: "Invalid ISO3 code." }, { status: 400 });
  }

  const view = request.nextUrl.searchParams.get("view")?.trim().toLowerCase();
  if (view === "summary") {
    try {
      const summary = await fetchDatabricksCountrySummary(iso3);
      if (!summary) {
        return NextResponse.json({ ok: false, error: "Country not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load country summary.";
      return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
  }

  return handleLegacyCountryDrilldown(iso3);
}
