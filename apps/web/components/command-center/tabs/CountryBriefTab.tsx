"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Gauge,
  HeartPulse,
  ShieldAlert,
  Users
} from "lucide-react";
import { ActionCard } from "@/components/command-center/country-data/ActionCard";
import { CountryHeader } from "@/components/command-center/country-data/CountryHeader";
import { MetricCard } from "@/components/command-center/country-data/MetricCard";
import { StatusBadge } from "@/components/command-center/country-data/StatusBadge";
import { SummaryBlock } from "@/components/command-center/country-data/SummaryBlock";
import type { CountrySummary, InsightsResult } from "@/lib/services/databricks";

type CountryBriefTabProps = {
  summary: CountrySummary | null;
  loading: boolean;
  error: string | null;
  generatedAt: string;
  insightError?: string | null;
  insight: InsightsResult | null;
  insightLoading?: boolean;
  pipelineLoading?: boolean;
  onOpenVisuals?: () => void;
  onOpenInsights?: () => void;
};

type DerivedAction = {
  title: string;
  text: string;
  ctaLabel?: string;
  ctaTarget?: "visuals" | "insights";
};

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function maybeCompact(value: number | null): string {
  return value === null ? "N/A" : compact(value);
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function maybeMoney(value: number | null): string {
  return value === null ? "N/A" : money(value);
}

function readableNarrative(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function coverageTone(coveragePct: number | null): "default" | "critical" | "warning" | "good" {
  if (coveragePct === null) return "default";
  if (coveragePct < 20) return "critical";
  if (coveragePct < 45) return "warning";
  return "good";
}

function fundingTone(fundingAdequacy: string): "default" | "critical" | "warning" | "good" {
  const value = fundingAdequacy.toLowerCase();
  if (value.includes("underfunded")) return "critical";
  if (value.includes("partial")) return "warning";
  if (value.includes("adequate") || value.includes("funded")) return "good";
  return "default";
}

function buildFallbackActions(summary: CountrySummary): DerivedAction[] {
  const actions: DerivedAction[] = [];
  if ((summary.coveragePct ?? 0) < 25) {
    actions.push({
      title: "Funding Priority",
      text: "Prioritize immediate donor outreach where coverage remains critically low.",
      ctaLabel: "View Funding Gaps",
      ctaTarget: "visuals"
    });
  }
  if ((summary.gapPerPersonUsd ?? 0) > 100) {
    actions.push({
      title: "Per-Person Gap",
      text: "Review interventions with highest per-person shortfalls before allocation changes.",
      ctaLabel: "Compare Trends",
      ctaTarget: "visuals"
    });
  }
  if ((summary.severityScore ?? 0) >= 60) {
    actions.push({
      title: "Risk Escalation",
      text: "Escalate high-severity signals to operations leads for near-term response planning.",
      ctaLabel: "Ask Why",
      ctaTarget: "insights"
    });
  }
  return actions.slice(0, 3);
}

export function CountryBriefTab({
  summary,
  loading,
  error,
  generatedAt,
  insightError = null,
  insight,
  insightLoading = false,
  pipelineLoading = false,
  onOpenVisuals,
  onOpenInsights
}: CountryBriefTabProps) {
  const [actionsOpen, setActionsOpen] = useState(true);

  const narrativeText =
    (insightError ? `Genie country summary failed: ${insightError}` : "") ||
    readableNarrative(insight?.summary?.trim() ?? "") ||
    readableNarrative(insight?.headline?.trim() ?? "") ||
    (insightLoading ? "Fetching the latest country summary from Genie. Please wait..." : "") ||
    "No country narrative has been returned by Genie yet. Try refreshing or selecting another country.";

  const derivedActions = useMemo<DerivedAction[]>(() => {
    if (!summary) return [] as DerivedAction[];
    if (insight?.actions?.length) {
      return insight.actions.slice(0, 3).map((text, index) => ({
        title: `Recommended Action ${index + 1}`,
        text
      }));
    }
    return buildFallbackActions(summary);
  }, [insight?.actions, summary]);

  const metricCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        key: "coverage",
        show: summary.coveragePct !== null,
        node: (
          <MetricCard
            label="Coverage"
            value={summary.coveragePct === null ? "N/A" : `${summary.coveragePct.toFixed(1)}%`}
            icon={BadgeCheck}
            tone={coverageTone(summary.coveragePct)}
            progressPct={summary.coveragePct}
            description="Share of required funding currently covered."
          />
        )
      },
      {
        key: "gap-person",
        show: summary.gapPerPersonUsd !== null && summary.gapPerPersonUsd > 0,
        node: (
          <MetricCard
            label="Gap / Person"
            value={maybeMoney(summary.gapPerPersonUsd)}
            icon={DollarSign}
            tone={summary.gapPerPersonUsd && summary.gapPerPersonUsd > 100 ? "warning" : "default"}
            description="Estimated funding shortfall per person in need."
          />
        )
      },
      {
        key: "people-in-need",
        show: summary.peopleInNeed !== null && summary.peopleInNeed > 0,
        node: (
          <MetricCard
            label="People in Need"
            value={maybeCompact(summary.peopleInNeed)}
            icon={Users}
            description="Estimated population requiring humanitarian assistance."
          />
        )
      },
      {
        key: "oci",
        show: summary.ociScore !== null && summary.ociScore > 0,
        node: (
          <MetricCard
            label="OCI Score"
            value={summary.ociScore === null ? "N/A" : summary.ociScore.toFixed(1)}
            icon={ShieldAlert}
            tone={summary.ociScore && summary.ociScore >= 60 ? "critical" : "default"}
            description="Overlooked Crisis Index; higher values indicate more overlooked crises."
          />
        )
      },
      {
        key: "severity",
        show: summary.severityScore !== null && summary.severityScore > 0,
        node: (
          <MetricCard
            label="Severity Score"
            value={summary.severityScore === null ? "N/A" : summary.severityScore.toFixed(2)}
            icon={HeartPulse}
            tone={summary.severityScore && summary.severityScore >= 60 ? "critical" : "default"}
            description="Relative crisis severity score from the source dataset."
          />
        )
      },
      {
        key: "funding-status",
        show: true,
        node: (
          <MetricCard
            label="Funding Status"
            value={summary.fundingAdequacy}
            icon={Gauge}
            tone={fundingTone(summary.fundingAdequacy)}
            description="Funding adequacy classification based on current gap and coverage."
          />
        )
      }
    ].filter((item) => item.show);
  }, [summary]);

  if (pipelineLoading) {
    return (
      <div id="tabpanel-country-data" role="tabpanel" aria-labelledby="tab-country-data" className="h-full space-y-3 overflow-y-auto pr-1">
        <section className="rounded-xl border border-[#31546d] bg-[#112738] p-3">
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9eb8ca]">Country Data</p>
          <p className="m-0 mt-1 text-sm font-semibold text-[#edf7ff]">Fetching summary from Genie...</p>
          <p className="m-0 mt-1 text-xs text-[#b5ccdc]">Waiting for selected country processing to finish.</p>
        </section>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-20 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#1c3b50]" />
        </div>
      </div>
    );
  }

  if (!summary && !loading) {
    return (
      <div id="tabpanel-country-data" role="tabpanel" aria-labelledby="tab-country-data" className="h-full overflow-y-auto pr-1">
        <p className="rounded-lg border border-[#2f526a] bg-[#102433] p-3 text-sm text-[#c4d8e7]">
          Select a country on the globe to see details.
        </p>
      </div>
    );
  }

  return (
    <div id="tabpanel-country-data" role="tabpanel" aria-labelledby="tab-country-data" className="h-full space-y-3 overflow-y-auto pr-1">
      {summary ? (
        <CountryHeader
          country={summary.country}
          iso3={summary.iso3}
          riskLabel={summary.riskLabel}
          fundingStatus={summary.fundingAdequacy}
          generatedAt={generatedAt}
        />
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="h-20 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#1c3b50]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#1c3b50]" />
        </div>
      ) : null}

      {error ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{error}</p> : null}

      {!loading && !error && summary ? (
        <>
          <section className="grid grid-cols-2 gap-2">
            {metricCards.map((card) => (
              <div key={card.key}>{card.node}</div>
            ))}
          </section>

          <section className="rounded-xl border border-[#2f526b] bg-[#10283a] p-3">
            <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb8ca]">Status Indicators</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge label={summary.riskLabel} kind="risk" />
              <StatusBadge label={summary.fundingAdequacy} kind="funding" />
              <StatusBadge
                label={`Severity ${summary.severityScore === null ? "N/A" : summary.severityScore.toFixed(2)}`}
                kind="neutral"
              />
            </div>
          </section>

          <SummaryBlock text={narrativeText} loading={insightLoading} />

          {summary.missingMetrics.length ? (
            <section className="rounded-xl border border-[#7a5e2f] bg-[#2f2716] p-2.5">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#ffdca0]">Data availability</p>
              <p className="m-0 mt-1 text-sm text-[#ffe9c2]">
                Some metrics are unavailable for this country/plan: {summary.missingMetrics.join(", ")}.
              </p>
            </section>
          ) : null}

          <section className="rounded-xl border border-[#2f526b] bg-[#10283a] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb8ca]">Recommended Actions</p>
              <button
                type="button"
                onClick={() => setActionsOpen((current) => !current)}
                className="inline-flex items-center gap-1 text-xs text-[#cde3f2]"
              >
                {actionsOpen ? (
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
            <div
              className={`grid gap-2 overflow-hidden transition-all duration-200 ease-out ${
                actionsOpen ? "mt-2 max-h-[520px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {derivedActions.length ? (
                derivedActions.map((item) => (
                  <ActionCard
                    key={`${item.title}-${item.text}`}
                    title={item.title}
                    text={item.text}
                    icon={AlertTriangle}
                    ctaLabel={item.ctaLabel}
                    onCta={
                      item.ctaTarget === "visuals"
                        ? onOpenVisuals
                        : item.ctaTarget === "insights"
                          ? onOpenInsights
                          : undefined
                    }
                  />
                ))
              ) : (
                <p className="m-0 text-sm text-[#dbe9f5]">No recommended actions were returned for this run.</p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
