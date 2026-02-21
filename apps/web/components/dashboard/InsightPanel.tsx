"use client";

import { FormEvent, useMemo, useState } from "react";
import type { GeoInsight, GeoMetrics } from "@/lib/api/crisiswatch";
import { ActionChip, EmptyState, LoadingSkeleton, SectionCard, StatPill } from "@/components/dashboard/ui-kit";

type InsightPanelProps = {
  isOpen: boolean;
  countryCode?: string;
  countryName?: string;
  metrics: GeoMetrics | null;
  insight: GeoInsight | null;
  metricsLoading: boolean;
  summaryLoading: boolean;
  metricsError: string | null;
  summaryError: string | null;
  progressLabel: string;
  followUpQuestion: string;
  lastAskedQuestion: string | null;
  onClose: () => void;
  onRefreshSummary: () => void;
  onFollowUpChange: (value: string) => void;
  onSubmitFollowUp: (event: FormEvent<HTMLFormElement>) => void;
  onFollowupChip: (question: string) => void;
};

type TabKey = "summary" | "drivers" | "actions" | "sources";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

export function InsightPanel({
  isOpen,
  countryCode,
  countryName,
  metrics,
  insight,
  metricsLoading,
  summaryLoading,
  metricsError,
  summaryError,
  progressLabel,
  followUpQuestion,
  lastAskedQuestion,
  onClose,
  onRefreshSummary,
  onFollowUpChange,
  onSubmitFollowUp,
  onFollowupChip
}: InsightPanelProps) {
  const [tab, setTab] = useState<TabKey>("summary");

  const keyDrivers = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: "Coverage", value: `${metrics.coverage_pct.toFixed(1)}%`, severity: Math.max(5, 100 - metrics.coverage_pct) },
      {
        label: "Gap / Person",
        value: formatCurrency(metrics.funding_gap_per_person),
        severity: Math.min(100, metrics.funding_gap_per_person)
      },
      {
        label: "Funding Gap",
        value: formatCurrency(metrics.funding_gap_usd),
        severity: Math.min(100, metrics.funding_gap_usd / 50_000_000)
      }
    ];
  }, [metrics]);

  return (
    <div className="h-auto xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)]">
      <SectionCard
        className="h-auto overflow-hidden xl:max-h-[calc(100vh-7rem)] xl:flex xl:flex-col"
        title="Geo-Insight Copilot"
        subtitle={
          countryName || metrics?.country
            ? `${countryName ?? metrics?.country} (${countryCode ?? metrics?.iso3 ?? "---"})${metrics?.year ? ` • ${metrics.year}` : ""}`
            : "Select a country on the globe"
        }
        rightSlot={
          <div className="flex items-center gap-2">
            {insight?.source ? <StatPill>{insight.source === "ai" ? "AI" : "Fallback"}</StatPill> : null}
            <button
              type="button"
              onClick={onRefreshSummary}
              disabled={summaryLoading || !countryCode}
              className="rounded-lg border border-[#4f7086] bg-[#113145] px-2.5 py-1 text-xs disabled:opacity-60"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#4f7086] bg-[#113145] px-2.5 py-1 text-xs"
            >
              Clear
            </button>
          </div>
        }
      >
        {!isOpen ? (
          <EmptyState
            title="No country selected"
            description="Pinch or click a country on the globe to load AI insight and metrics."
          />
        ) : (
          <div className="xl:min-h-0 xl:overflow-y-auto xl:pr-1">
            <div className="mb-3 grid grid-cols-2 gap-2">
              {metricsLoading || !metrics ? (
                <>
                  <LoadingSkeleton className="h-16" />
                  <LoadingSkeleton className="h-16" />
                  <LoadingSkeleton className="h-16" />
                  <LoadingSkeleton className="h-16" />
                </>
              ) : (
                <>
                  <StatPill>Coverage {metrics.coverage_pct.toFixed(1)}%</StatPill>
                  <StatPill>PIN {formatCompact(metrics.people_in_need)}</StatPill>
                  <StatPill>Funding {formatCurrency(metrics.funding_usd)}</StatPill>
                  <StatPill>Req {formatCurrency(metrics.requirements_usd)}</StatPill>
                </>
              )}
            </div>

            {metricsError ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{metricsError}</p> : null}
            {summaryError ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{summaryError}</p> : null}
            {summaryLoading ? (
              <p className="rounded-lg border border-[#2f5165] bg-[#102433] p-2 text-sm text-[#c7d8e4]">{progressLabel}</p>
            ) : null}
            {lastAskedQuestion ? (
              <p className="my-2 rounded-md border border-[#315267] bg-[#102433] px-2 py-1 text-xs text-[#c8d9e5]">
                Asked: {lastAskedQuestion}
              </p>
            ) : null}

            <div className="mb-2 flex flex-wrap gap-1.5">
              {([
                ["summary", "Summary"],
                ["drivers", "Drivers"],
                ["actions", "Actions"],
                ["sources", "Sources"]
              ] as Array<[TabKey, string]>).map(([key, label]) => (
                <ActionChip key={key} onClick={() => setTab(key)} disabled={tab === key}>
                  {label}
                </ActionChip>
              ))}
            </div>

            <div className="max-h-[44vh] overflow-y-auto rounded-xl border border-[#2f5064] bg-[#0f2434] p-2.5">
              {tab === "summary" ? (
                <div className="space-y-2">
                  <p className="m-0 font-semibold">{insight?.headline ?? "Awaiting insight..."}</p>
                  <p className="m-0 text-sm leading-6 text-[#d7e5f0]">{insight?.summary ?? ""}</p>
                  {insight?.followups?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {insight.followups.map((item) => (
                        <ActionChip key={item} onClick={() => onFollowupChip(item)}>
                          {item}
                        </ActionChip>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {tab === "drivers" ? (
                <div className="space-y-2">
                  {keyDrivers.map((driver) => (
                    <div key={driver.label} className="rounded-lg border border-[#315267] bg-[#122a3b] p-2">
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{driver.label}</span>
                        <strong>{driver.value}</strong>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#0a1722]">
                        <div
                          className="h-full rounded-full bg-[#6ec2ff]"
                          style={{ width: `${Math.max(8, Math.min(100, driver.severity))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {insight?.flags?.length ? (
                    <ul className="list-disc pl-5 text-sm text-[#dbe8f2]">
                      {insight.flags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {tab === "actions" ? (
                <div className="space-y-2">
                  {(insight?.flags ?? []).map((flag, index) => (
                    <div key={`${flag}-${index}`} className="rounded-lg border border-[#315267] bg-[#122a3b] p-2 text-sm">
                      <p className="m-0 font-semibold">Priority {index + 1}</p>
                      <p className="m-0 mt-1 text-[#dbe8f2]">{flag}</p>
                      <p className="m-0 mt-1 text-xs text-[#9eb8ca]">Why this matters: helps reduce unmet need faster.</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {tab === "sources" ? (
                <div className="space-y-2 text-sm">
                  <p className="m-0">Table: <code>workspace.hdx.api_crisis_priority_2026</code></p>
                  <p className="m-0">Metrics cited: coverage %, funding gap, funding gap per person, people in need.</p>
                  <p className="m-0">Updated: {new Date().toLocaleTimeString()}</p>
                </div>
              ) : null}
            </div>

            <form onSubmit={onSubmitFollowUp} className="mt-3 border-t border-[#27475c] pt-3">
              <label className="mb-1 block text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Ask follow-up</label>
              <textarea
                value={followUpQuestion}
                onChange={(event) => onFollowUpChange(event.target.value)}
                rows={2}
                placeholder="Ask a concise follow-up question"
                className="w-full resize-none rounded-lg border border-[#31546a] bg-[#0d1f2c] px-2.5 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={summaryLoading || !countryCode || !followUpQuestion.trim()}
                className="mt-2 rounded-md border border-[#4f7086] bg-[#113145] px-3 py-1.5 text-sm disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
