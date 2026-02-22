"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CountryMetrics } from "@/lib/types";

type CountryBriefTabProps = {
  countryCode?: string;
  countryName?: string;
  metric: CountryMetrics | null;
  loading: boolean;
  error: string | null;
  summaryText?: string | null;
  sql?: string | null;
  queryResult?: {
    columns: string[];
    rows: unknown[][];
    rowCount?: number;
  } | null;
  formatted: {
    headline: string;
    summary: string;
    keyPoints: string[];
    actions: string[];
    followups: string[];
    metricHighlights?: Array<{ label: string; value: string }>;
  } | null;
};

type CountrySnapshot = {
  country: string;
  iso3: string;
  year: number | null;
  coveragePct: number | null;
  fundingGapUsd: number | null;
  fundingReceivedUsd: number | null;
  fundingRequiredUsd: number | null;
  peopleInNeed: number | null;
  ociScore: number | null;
  severityScore: number | null;
  fundingGapScore: number | null;
  crisisStatus: string | null;
  ociVariant: string | null;
  dataCompletenessLabel: string | null;
  hasHnoData: boolean | null;
  hasFundingData: boolean | null;
};

function findColumnIndex(columns: string[], ...aliases: string[]): number {
  const normalized = columns.map((column) => column.toLowerCase());
  for (const alias of aliases) {
    const direct = normalized.findIndex((column) => column === alias.toLowerCase());
    if (direct !== -1) return direct;
  }
  for (const alias of aliases) {
    const fuzzy = normalized.findIndex((column) => column.includes(alias.toLowerCase()));
    if (fuzzy !== -1) return fuzzy;
  }
  return -1;
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function compact(value: number): string {
  const safe = Math.max(0, value);
  if (safe >= 1_000_000_000) return `${(safe / 1_000_000_000).toFixed(1)}B`;
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M`;
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(1)}K`;
  return safe.toFixed(0);
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function moneyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

function statusFromOci(oci: number | null): string {
  if (!Number.isFinite(oci ?? NaN)) return "Unclassified";
  if ((oci ?? 0) >= 80) return "CRITICAL - Overlooked";
  if ((oci ?? 0) >= 60) return "HIGH - Overlooked";
  if ((oci ?? 0) >= 40) return "MODERATE - Watch";
  return "LOW - Stable";
}

function statusTone(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized.includes("CRITICAL")) return "border-[#b63f50] bg-[#441923] text-[#ffdbe1]";
  if (normalized.includes("HIGH")) return "border-[#b9672c] bg-[#452514] text-[#ffd9be]";
  if (normalized.includes("MODERATE")) return "border-[#9b7f38] bg-[#3c3018] text-[#f2e5bf]";
  return "border-[#3d845f] bg-[#1f3728] text-[#d8efdf]";
}

function coverageBand(coveragePct: number | null): { label: string; className: string } {
  if (coveragePct === null) {
    return { label: "Coverage unavailable", className: "border-[#3a5d76] bg-[#173246] text-[#cfe2ef]" };
  }
  if (coveragePct < 20) {
    return { label: "Severely underfunded", className: "border-[#b63f50] bg-[#441923] text-[#ffdbe1]" };
  }
  if (coveragePct < 40) {
    return { label: "High funding shortfall", className: "border-[#b9672c] bg-[#452514] text-[#ffd9be]" };
  }
  if (coveragePct < 60) {
    return { label: "Moderate funding pressure", className: "border-[#9b7f38] bg-[#3c3018] text-[#f2e5bf]" };
  }
  return { label: "Relatively funded", className: "border-[#3d845f] bg-[#1f3728] text-[#d8efdf]" };
}

function normalizeBullet(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function dedupePoints(points: string[], summary: string): string[] {
  const normalizedSummary = normalizeBullet(summary);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const point of points) {
    const normalizedPoint = normalizeBullet(point);
    if (!normalizedPoint || seen.has(normalizedPoint)) continue;
    if (normalizedSummary.includes(normalizedPoint)) continue;
    seen.add(normalizedPoint);
    out.push(point);
  }
  return out.slice(0, 4);
}

function parseGenieSnapshot(
  queryResult: CountryBriefTabProps["queryResult"],
  fallbackCountryName: string | undefined,
  fallbackIso3: string | undefined
): CountrySnapshot | null {
  if (!queryResult?.columns?.length || !queryResult.rows?.length) return null;
  const columns = queryResult.columns;
  const idxCountry = findColumnIndex(columns, "country_name", "country_plan_name", "country");
  const idxIso3 = findColumnIndex(columns, "iso3", "country_iso3", "country_code");
  const targetIso = fallbackIso3?.trim().toUpperCase();
  const targetCountry = fallbackCountryName?.trim().toLowerCase();
  let candidate: unknown[] | null = null;

  if (idxIso3 >= 0 && targetIso) {
    candidate =
      queryResult.rows.find((row) => {
        if (!Array.isArray(row)) return false;
        return String(row[idxIso3] ?? "").trim().toUpperCase() === targetIso;
      }) ?? null;
  }

  if (!candidate && idxCountry >= 0 && targetCountry) {
    candidate =
      queryResult.rows.find((row) => {
        if (!Array.isArray(row)) return false;
        const candidateCountry = String(row[idxCountry] ?? "").trim().toLowerCase();
        if (!candidateCountry) return false;
        return candidateCountry === targetCountry || candidateCountry.includes(targetCountry);
      }) ?? null;
  }

  if (!candidate && queryResult.rows.length === 1 && Array.isArray(queryResult.rows[0])) {
    candidate = queryResult.rows[0] ?? null;
  }

  if (!candidate && !targetIso && Array.isArray(queryResult.rows[0])) {
    candidate = queryResult.rows[0];
  }

  if (!candidate || !Array.isArray(candidate)) return null;

  const idxYear = findColumnIndex(columns, "year");
  const idxOci = findColumnIndex(columns, "overlooked_crisis_index", "oci_score", "oci");
  const idxSeverity = findColumnIndex(columns, "severity_score");
  const idxGapScore = findColumnIndex(columns, "funding_gap_score");
  const idxPin = findColumnIndex(columns, "people_in_need", "total_people_in_need");
  const idxStatus = findColumnIndex(columns, "crisis_status");
  const idxCoverage = findColumnIndex(columns, "funding_coverage_pct", "coverage_pct");
  const idxGapUsd = findColumnIndex(columns, "funding_gap_usd", "gap_usd");
  const idxGapMillions = findColumnIndex(columns, "gap_millions_usd", "funding_gap_millions_usd");
  const idxReceived = findColumnIndex(columns, "funding_received_usd", "total_funding_usd");
  const idxRequired = findColumnIndex(columns, "funding_required_usd", "total_requirements_usd");
  const idxHasHno = findColumnIndex(columns, "has_hno_data");
  const idxHasFunding = findColumnIndex(columns, "has_funding_data");
  const idxVariant = findColumnIndex(columns, "oci_variant");
  const idxCompleteness = findColumnIndex(columns, "data_completeness_label", "data_completeness");

  const fundingReceivedUsd = idxReceived >= 0 ? toNum(candidate[idxReceived]) : null;
  const fundingRequiredUsd = idxRequired >= 0 ? toNum(candidate[idxRequired]) : null;
  const gapFromUsd = idxGapUsd >= 0 ? toNum(candidate[idxGapUsd]) : null;
  const gapFromMillions = idxGapMillions >= 0 ? toNum(candidate[idxGapMillions]) : null;
  const computedGap =
    fundingRequiredUsd !== null && fundingReceivedUsd !== null
      ? Math.max(0, fundingRequiredUsd - fundingReceivedUsd)
      : null;
  const fundingGapUsd = gapFromUsd ?? (gapFromMillions !== null ? gapFromMillions * 1_000_000 : computedGap);

  const directCoverage = idxCoverage >= 0 ? toNum(candidate[idxCoverage]) : null;
  const computedCoverage =
    fundingRequiredUsd && fundingRequiredUsd > 0 && fundingReceivedUsd !== null
      ? (fundingReceivedUsd / fundingRequiredUsd) * 100
      : null;
  const coveragePct = directCoverage ?? computedCoverage;

  return {
    country: (idxCountry >= 0 ? String(candidate[idxCountry] ?? "").trim() : "") || fallbackCountryName || "Unknown",
    iso3: (idxIso3 >= 0 ? String(candidate[idxIso3] ?? "").trim().toUpperCase() : "") || targetIso || "---",
    year: idxYear >= 0 ? toNum(candidate[idxYear]) : null,
    coveragePct,
    fundingGapUsd,
    fundingReceivedUsd,
    fundingRequiredUsd,
    peopleInNeed: idxPin >= 0 ? toNum(candidate[idxPin]) : null,
    ociScore: idxOci >= 0 ? toNum(candidate[idxOci]) : null,
    severityScore: idxSeverity >= 0 ? toNum(candidate[idxSeverity]) : null,
    fundingGapScore: idxGapScore >= 0 ? toNum(candidate[idxGapScore]) : null,
    crisisStatus: idxStatus >= 0 ? String(candidate[idxStatus] ?? "").trim() || null : null,
    ociVariant: idxVariant >= 0 ? String(candidate[idxVariant] ?? "").trim() || null : null,
    dataCompletenessLabel:
      idxCompleteness >= 0 ? String(candidate[idxCompleteness] ?? "").trim() || null : null,
    hasHnoData: idxHasHno >= 0 ? toBool(candidate[idxHasHno]) : null,
    hasFundingData: idxHasFunding >= 0 ? toBool(candidate[idxHasFunding]) : null
  };
}

function valueBarColor(metric: "coverage" | "oci" | "gap", value: number): string {
  if (metric === "coverage") {
    if (value < 20) return "bg-[#f87171]";
    if (value < 40) return "bg-[#fb923c]";
    if (value < 60) return "bg-[#facc15]";
    return "bg-[#4ade80]";
  }
  if (value > 80) return "bg-[#f87171]";
  if (value > 60) return "bg-[#fb923c]";
  if (value > 40) return "bg-[#facc15]";
  return "bg-[#7fd5ff]";
}

function formatQueryCell(column: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const col = column.toLowerCase();
    if (col.includes("_usd")) return moneyFull(numeric);
    if (col.includes("people_in_need")) return compact(numeric);
    if (col.includes("_pct")) return `${numeric.toFixed(2)}%`;
    if (col.includes("index") || col.includes("score") || col.includes("ratio")) return numeric.toFixed(2);
    if (Math.abs(numeric) >= 1000) {
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numeric);
    }
    return numeric.toString();
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function CountryBriefTab({
  countryCode,
  countryName,
  metric,
  loading,
  error,
  summaryText,
  sql,
  queryResult,
  formatted
}: CountryBriefTabProps) {
  void metric;
  const [expanded, setExpanded] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);

  useEffect(() => {
    setExpanded(false);
    setShowAllRows(false);
  }, [countryCode]);

  const snapshot = useMemo(
    () => parseGenieSnapshot(queryResult, countryName, countryCode),
    [countryCode, countryName, queryResult]
  );
  const statusLabel = snapshot?.crisisStatus || statusFromOci(snapshot?.ociScore ?? null);
  const coverageInfo = coverageBand(snapshot?.coveragePct ?? null);
  const overviewText = formatted?.summary || summaryText || "No country narrative available for this selection.";
  const keyPoints = useMemo(() => dedupePoints(formatted?.keyPoints ?? [], overviewText), [formatted?.keyPoints, overviewText]);
  const hasQueryTable = Boolean(queryResult?.columns?.length);

  if (!countryCode) {
    return (
      <div id="tabpanel-country-brief" role="tabpanel" aria-labelledby="tab-country-brief">
        <p className="rounded-lg border border-[#2f526a] bg-[#102433] p-3 text-sm text-[#c4d8e7]">
          Select a country on the globe to run a Genie country query.
        </p>
      </div>
    );
  }

  return (
    <div id="tabpanel-country-brief" role="tabpanel" aria-labelledby="tab-country-brief" className="space-y-3">
      <header className="rounded-xl border border-[#31546d] bg-[linear-gradient(180deg,#12283a_0%,#102332_100%)] p-3">
        <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9eb8ca]">Country Query Brief</p>
        <p className="m-0 mt-1 text-base font-semibold text-[#edf7ff]">
          {(snapshot?.country || countryName || "Unknown")} ({snapshot?.iso3 || countryCode})
          {snapshot?.year ? ` • ${Math.round(snapshot.year)}` : ""}
        </p>
        {!loading && snapshot ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(statusLabel)}`}>
              {statusLabel}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${coverageInfo.className}`}>
              {coverageInfo.label}
            </span>
            <span className="rounded-full border border-[#3f6782] bg-[#133148] px-2.5 py-1 text-[11px] text-[#d7e8f4]">
              Source: Genie query row
            </span>
          </div>
        ) : null}
      </header>

      {loading ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-16 animate-pulse rounded-lg bg-[#1c3b50]" />
            <div className="h-16 animate-pulse rounded-lg bg-[#1c3b50]" />
            <div className="h-16 animate-pulse rounded-lg bg-[#1c3b50]" />
            <div className="h-16 animate-pulse rounded-lg bg-[#1c3b50]" />
          </div>
          <p className="rounded-lg border border-[#35576e] bg-[#102433] p-2 text-xs text-[#c6d9e7]">
            Querying Genie country data...
          </p>
        </>
      ) : null}

      {error ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{error}</p> : null}

      {!loading && !error && snapshot ? (
        <>
          <section className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Coverage</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">
                {snapshot.coveragePct !== null ? `${snapshot.coveragePct.toFixed(1)}%` : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Funding Gap</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">
                {snapshot.fundingGapUsd !== null ? money(snapshot.fundingGapUsd) : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">People In Need</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">
                {snapshot.peopleInNeed !== null ? compact(snapshot.peopleInNeed) : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">OCI Score</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">
                {snapshot.ociScore !== null ? snapshot.ociScore.toFixed(2) : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Severity</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">
                {snapshot.severityScore !== null ? snapshot.severityScore.toFixed(2) : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Funding Gap Score</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">
                {snapshot.fundingGapScore !== null ? snapshot.fundingGapScore.toFixed(2) : "N/A"}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-[#2f526b] bg-[#10283a] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">
                {formatted?.headline || "What is happening"}
              </p>
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="inline-flex items-center gap-1 text-xs text-[#cde3f2]"
              >
                {expanded ? (
                  <>
                    Collapse <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Expand <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
            <p className={`m-0 mt-2 text-sm leading-6 text-[#d9e8f5] ${expanded ? "" : "line-clamp-5"}`}>
              {overviewText}
            </p>
          </section>

          {keyPoints.length ? (
            <section className="rounded-lg border border-[#2f526b] bg-[#10283a] p-3">
              <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">Key Points</p>
              <ul className="m-0 mt-2 space-y-1.5 pl-4 text-sm text-[#dcebf7]">
                {keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {formatted?.actions?.length ? (
            <section className="grid gap-2">
              {formatted.actions.map((item, index) => (
                <article key={item} className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2.5">
                  <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#9eb8ca]">Recommended Action {index + 1}</p>
                  <p className="m-0 mt-1 text-sm text-[#dbe9f5]">{item}</p>
                </article>
              ))}
            </section>
          ) : null}

          {formatted?.followups?.length ? (
            <section className="rounded-lg border border-[#2f526b] bg-[#10283a] p-3">
              <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">Follow-up Prompts</p>
              <ul className="m-0 mt-2 space-y-1.5 pl-4 text-sm text-[#dcebf7]">
                {formatted.followups.map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-lg border border-[#2f526b] bg-[#10283a] p-3">
            <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb8ca]">Operational Signals</p>
            <ul className="m-0 mt-2 space-y-1.5 pl-4 text-sm text-[#dcebf7]">
              <li>Funding adequacy: {coverageInfo.label}</li>
              <li>Total funding gap: {snapshot.fundingGapUsd !== null ? money(snapshot.fundingGapUsd) : "N/A"}</li>
              <li>
                Funding received / required:{" "}
                {snapshot.fundingReceivedUsd !== null && snapshot.fundingRequiredUsd !== null
                  ? `${money(snapshot.fundingReceivedUsd)} / ${money(snapshot.fundingRequiredUsd)}`
                  : "N/A"}
              </li>
              <li>Data completeness: {snapshot.dataCompletenessLabel || snapshot.ociVariant || "Not specified"}</li>
            </ul>
          </section>

          <section className="rounded-lg border border-[#2f526b] bg-[#10283a] p-3">
            <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">Risk Profile</p>
            <div className="mt-2 grid gap-2">
              {[
                { label: "Coverage", value: snapshot.coveragePct ?? 0, max: 100, metric: "coverage" as const },
                { label: "OCI", value: snapshot.ociScore ?? 0, max: 100, metric: "oci" as const },
                { label: "Funding Gap Score", value: snapshot.fundingGapScore ?? 0, max: 100, metric: "gap" as const }
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-[#cfe2ef]">
                    <span>{item.label}</span>
                    <span>{item.value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#0d1e2b]">
                    <div
                      className={`h-full rounded-full ${valueBarColor(item.metric, item.value)}`}
                      style={{ width: `${Math.max(4, Math.min(100, (item.value / item.max) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

        </>
      ) : null}

      {!loading && !error && hasQueryTable ? (
        <section className="rounded-lg border border-[#2f526b] bg-[#10283a] p-3">
          <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">Genie Query Result</p>
          <p className="m-0 mt-1 text-xs text-[#b5ccdc]">
            Columns: {queryResult?.columns.length ?? 0} • Rows: {queryResult?.rowCount ?? queryResult?.rows.length ?? 0}
          </p>
          <div className="mt-2 max-h-72 overflow-auto rounded-md border border-[#2f526b] bg-[#0f2332]">
            <table className="min-w-[760px] border-collapse text-left text-xs text-[#dcebf7]">
              <thead className="sticky top-0 bg-[#112d42] text-[#b7ccdc]">
                <tr>
                  {(queryResult?.columns ?? []).map((column) => (
                    <th key={column} className="px-2 py-1.5 font-semibold">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(showAllRows ? queryResult?.rows ?? [] : (queryResult?.rows ?? []).slice(0, 25)).map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`} className="border-t border-[#1f3f55]">
                    {(queryResult?.columns ?? []).map((column, colIndex) => {
                      const candidate = row as unknown;
                      const value = Array.isArray(candidate)
                        ? candidate[colIndex]
                        : candidate && typeof candidate === "object"
                          ? (candidate as Record<string, unknown>)[column]
                          : undefined;
                      return (
                        <td key={`cell-${rowIndex}-${colIndex}`} className="px-2 py-1.5 align-top">
                          {formatQueryCell(column, value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(queryResult?.rows.length ?? 0) > 25 ? (
            <button
              type="button"
              onClick={() => setShowAllRows((current) => !current)}
              className="mt-2 rounded-md border border-[#3d627a] bg-[#112d40] px-2.5 py-1 text-xs text-[#cfe1ee]"
            >
              {showAllRows ? "Show first 25 rows" : `Show all ${queryResult?.rows.length ?? 0} rows`}
            </button>
          ) : null}
          {sql ? (
            <details className="mt-2 rounded-md border border-[#2f526b] bg-[#0f2332] p-2">
              <summary className="cursor-pointer text-xs text-[#cfe1ee]">Show SQL used by Genie</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-[#bcd4e4]">{sql}</pre>
            </details>
          ) : null}
        </section>
      ) : null}

      {!loading && !error && !snapshot && !hasQueryTable ? (
        <p className="rounded-lg border border-[#35576e] bg-[#102433] p-2 text-xs text-[#c6d9e7]">
          No Genie country data loaded yet for this country.
        </p>
      ) : null}
    </div>
  );
}
