"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Info } from "lucide-react";
import { CountryMetrics } from "@/lib/types";

type CountryBriefTabProps = {
  countryCode?: string;
  countryName?: string;
  metric: CountryMetrics | null;
  loading: boolean;
  error: string | null;
  formatted: {
    headline: string;
    summary: string;
    keyPoints: string[];
    actions: string[];
    followups: string[];
    metricHighlights?: Array<{ label: string; value: string }>;
  } | null;
};

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function statusFromOci(oci: number | undefined): string {
  if (!Number.isFinite(oci ?? NaN)) return "Unclassified";
  if ((oci ?? 0) >= 80) return "CRITICAL - Overlooked";
  if ((oci ?? 0) >= 60) return "HIGH - Overlooked";
  if ((oci ?? 0) >= 40) return "MODERATE - Watch";
  return "LOW - Stable";
}

export function CountryBriefTab({
  countryCode,
  countryName,
  metric,
  loading,
  error,
  formatted
}: CountryBriefTabProps) {
  const [expanded, setExpanded] = useState(false);

  const derived = useMemo(() => {
    if (!metric) return null;
    const gapUsd = Math.max(0, metric.fundingRequired - metric.fundingReceived);
    const gapPerPerson = metric.inNeed > 0 ? gapUsd / metric.inNeed : 0;
    return {
      coverage: metric.percentFunded,
      gapPerPerson,
      peopleInNeed: metric.inNeed,
      oci: metric.overlookedScore ?? 0,
      severity: metric.severityScore
    };
  }, [metric]);

  if (!countryCode) {
    return (
      <div id="tabpanel-country-brief" role="tabpanel" aria-labelledby="tab-country-brief">
        <p className="rounded-lg border border-[#2f526a] bg-[#102433] p-3 text-sm text-[#c4d8e7]">
          Select a country on the globe to view a structured country brief.
        </p>
      </div>
    );
  }

  return (
    <div id="tabpanel-country-brief" role="tabpanel" aria-labelledby="tab-country-brief" className="space-y-3">
      <header className="rounded-xl border border-[#31546d] bg-[#112738] p-3">
        <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9eb8ca]">Country Brief</p>
        <p className="m-0 mt-1 text-sm font-semibold text-[#edf7ff]">
          {(countryName ?? metric?.country ?? "Unknown")} ({countryCode})
        </p>
        <p className="m-0 mt-1 text-xs text-[#b5ccdc]">{statusFromOci(metric?.overlookedScore)}</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-16 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-16 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-16 animate-pulse rounded-lg bg-[#1c3b50]" />
        </div>
      ) : null}

      {error ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{error}</p> : null}

      {!loading && !error && derived ? (
        <>
          <section className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Coverage</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{derived.coverage.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Gap / Person</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{money(derived.gapPerPerson)}</p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">People In Need</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{compact(derived.peopleInNeed)}</p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">OCI Score</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{derived.oci.toFixed(1)}</p>
            </div>
          </section>

          <section className="rounded-lg border border-[#2f526b] bg-[#10283a] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">What&apos;s happening</p>
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
            <p className={`m-0 mt-2 text-sm leading-6 text-[#d9e8f5] ${expanded ? "" : "line-clamp-4"}`}>
              {formatted?.summary || "No country narrative available for this selection."}
            </p>
          </section>

          {formatted?.actions?.length ? (
            <section className="grid gap-2">
              {formatted.actions.slice(0, 3).map((item, index) => (
                <article key={item} className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2.5">
                  <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#9eb8ca]">Recommended Action {index + 1}</p>
                  <p className="m-0 mt-1 text-sm text-[#dbe9f5]">{item}</p>
                </article>
              ))}
            </section>
          ) : null}

          <section className="rounded-lg border border-[#2f526b] bg-[#10283a] p-3">
            <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb8ca]">Signals</p>
            <ul className="m-0 mt-2 space-y-1.5 pl-4 text-sm text-[#dcebf7]">
              <li>Severity score: {derived.severity.toFixed(2)}</li>
              <li>Funding adequacy: {derived.coverage >= 50 ? "Improving coverage" : "Below adequacy threshold"}</li>
              <li>Risk level: {statusFromOci(metric?.overlookedScore)}</li>
            </ul>
          </section>
        </>
      ) : null}

      <Link
        href={`/insights?country=${encodeURIComponent(countryCode)}`}
        className="inline-flex items-center gap-1 rounded-lg border border-[#4a7089] bg-[#11344b] px-3 py-1.5 text-sm text-[#e2f0fa]"
      >
        Open in Insights
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>

      {!loading && !error && !metric ? (
        <p className="rounded-lg border border-[#35576e] bg-[#102433] p-2 text-xs text-[#c6d9e7]">
          <Info className="mr-1 inline h-3.5 w-3.5" />
          Country KPI records are unavailable for this selection.
        </p>
      ) : null}
    </div>
  );
}

