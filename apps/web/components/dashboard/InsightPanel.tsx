import { FormEvent } from "react";
import type { GeoInsight, GeoMetrics } from "@/lib/api/crisiswatch";

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

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function CardSkeleton() {
  return <div className="h-[78px] animate-pulse rounded-xl border border-[#2d4d61] bg-[#122634]" />;
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
  const coverage = metrics ? `${metrics.coverage_pct.toFixed(1)}%` : "--";

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-[#02060a]/45 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-40 flex h-screen w-full max-w-[460px] flex-col border-l border-[#2f5168] bg-[#0b1a26]/95 p-4 backdrop-blur transition-transform duration-250 sm:w-[440px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#27475c] pb-3">
          <div>
            <h2 className="m-0 text-xl font-semibold">Insight Panel</h2>
            <p className="m-0 mt-1 text-sm text-[#9fb9ca]">
              {countryName ?? metrics?.country ?? "Selected Country"}
              {countryCode ? ` (${countryCode})` : metrics?.iso3 ? ` (${metrics.iso3})` : ""}
              {metrics?.year ? ` • ${metrics.year}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#4f7086] bg-[#112f41] px-2.5 py-1 text-sm"
          >
            Close
          </button>
        </div>

        <section className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="m-0 text-sm uppercase tracking-[0.05em] text-[#b9ccda]">Country Metrics</h3>
            <div className="rounded-md border border-[#2d4d61] bg-[#112837] px-2.5 py-1 text-sm">
              Coverage: <strong>{coverage}</strong>
            </div>
          </div>
          {metricsError ? (
            <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{metricsError}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {metricsLoading || !metrics ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : (
              <>
                <div className="rounded-xl border border-[#2d4d61] bg-[#102433] p-2.5">
                  <p className="m-0 text-xs text-[#9eb7c8]">People In Need</p>
                  <p className="m-0 mt-1 text-lg font-semibold">{formatCompact(metrics.people_in_need)}</p>
                </div>
                <div className="rounded-xl border border-[#2d4d61] bg-[#102433] p-2.5">
                  <p className="m-0 text-xs text-[#9eb7c8]">Funding</p>
                  <p className="m-0 mt-1 text-lg font-semibold">{formatCurrency(metrics.funding_usd)}</p>
                </div>
                <div className="rounded-xl border border-[#2d4d61] bg-[#102433] p-2.5">
                  <p className="m-0 text-xs text-[#9eb7c8]">Requirements</p>
                  <p className="m-0 mt-1 text-lg font-semibold">{formatCurrency(metrics.requirements_usd)}</p>
                </div>
                <div className="rounded-xl border border-[#2d4d61] bg-[#102433] p-2.5">
                  <p className="m-0 text-xs text-[#9eb7c8]">Gap / Person</p>
                  <p className="m-0 mt-1 text-lg font-semibold">{formatCurrency(metrics.funding_gap_per_person)}</p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mb-4 flex-1 overflow-y-auto">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="m-0 text-sm uppercase tracking-[0.05em] text-[#b9ccda]">Geo-Insight Summary</h3>
            <button
              type="button"
              onClick={onRefreshSummary}
              disabled={summaryLoading || !countryCode}
              className="rounded-md border border-[#4f7086] bg-[#113145] px-2.5 py-1 text-xs disabled:opacity-60"
            >
              Refresh Summary
            </button>
          </div>

          {summaryLoading ? (
            <p className="rounded-lg border border-[#2f5165] bg-[#102433] p-2 text-sm text-[#c7d8e4]">
              {progressLabel}
            </p>
          ) : null}

          {summaryError ? (
            <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{summaryError}</p>
          ) : null}

          {insight?.source ? (
            <p className="mb-2 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">
              Source: {insight.source === "ai" ? "Agent Brick (AI)" : "Fallback Formatter"}
            </p>
          ) : null}

          {lastAskedQuestion ? (
            <p className="mb-2 rounded-md border border-[#315267] bg-[#102433] px-2 py-1 text-xs text-[#c8d9e5]">
              Asked: {lastAskedQuestion}
            </p>
          ) : null}

          {insight?.headline ? (
            <p className="rounded-lg border border-[#2f5064] bg-[#102433] p-2.5 text-sm font-semibold leading-6">
              {insight.headline}
            </p>
          ) : null}

          {insight?.summary ? (
            <p className="mt-2 rounded-lg border border-[#2f5064] bg-[#102433] p-2.5 text-sm leading-6">
              {insight.summary}
            </p>
          ) : null}

          {insight?.flags?.length ? (
            <div className="mt-2">
              <p className="m-0 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Flags</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[#dbe8f2]">
                {insight.flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {insight?.followups?.length ? (
            <div className="mt-3 rounded-xl border border-[#2f5064] bg-[#0f2130] p-2.5 text-sm">
              <p className="m-0 mb-1 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Suggested Follow-ups</p>
              <div className="flex flex-wrap gap-2">
                {insight.followups.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onFollowupChip(item)}
                    className="rounded-full border border-[#3f6278] bg-[#133348] px-2.5 py-1 text-xs"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <form onSubmit={onSubmitFollowUp} className="border-t border-[#27475c] pt-3">
          <label className="mb-1 block text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Ask Follow-up</label>
          <textarea
            value={followUpQuestion}
            onChange={(event) => onFollowUpChange(event.target.value)}
            rows={3}
            placeholder="Example: explain the biggest funding anomaly in the last period"
            className="w-full resize-none rounded-lg border border-[#31546a] bg-[#0d1f2c] px-2.5 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={summaryLoading || !countryCode || !followUpQuestion.trim()}
            className="mt-2 rounded-md border border-[#4f7086] bg-[#113145] px-3 py-1.5 text-sm disabled:opacity-60"
          >
            Send Follow-up
          </button>
        </form>
      </aside>
    </>
  );
}
