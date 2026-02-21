import { FormEvent } from "react";
import type { GenieSummaryResponse, InsightMetricsResponse } from "@/lib/api/crisiswatch";

type InsightPanelProps = {
  isOpen: boolean;
  countryCode?: string;
  countryName?: string;
  metrics: InsightMetricsResponse | null;
  summary: GenieSummaryResponse | null;
  metricsLoading: boolean;
  summaryLoading: boolean;
  metricsError: string | null;
  summaryError: string | null;
  progressLabel: string;
  followUpQuestion: string;
  onClose: () => void;
  onRefreshSummary: () => void;
  onFollowUpChange: (value: string) => void;
  onSubmitFollowUp: (event: FormEvent<HTMLFormElement>) => void;
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

function formatRatio(value: number | null): string {
  if (value === null) return "N/A";
  if (value >= 1_000_000) return value.toExponential(2);
  return value.toFixed(2);
}

function CardSkeleton() {
  return <div className="h-[78px] animate-pulse rounded-xl border border-[#2d4d61] bg-[#122634]" />;
}

function renderRowsTable(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return null;
  const columns = Object.keys(rows[0]).slice(0, 4);
  if (columns.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-[#2f5064]">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-[#0d1d29] text-[#b9ccda]">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-2.5 py-2 font-semibold uppercase tracking-[0.03em]">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row, idx) => (
            <tr key={idx} className="border-t border-[#203b4d] text-[#dce9f3]">
              {columns.map((column) => (
                <td key={column} className="px-2.5 py-2 align-top">
                  {String(row[column] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InsightPanel({
  isOpen,
  countryCode,
  countryName,
  metrics,
  summary,
  metricsLoading,
  summaryLoading,
  metricsError,
  summaryError,
  progressLabel,
  followUpQuestion,
  onClose,
  onRefreshSummary,
  onFollowUpChange,
  onSubmitFollowUp
}: InsightPanelProps) {
  const rowTable = summary?.rows ? renderRowsTable(summary.rows) : null;

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
              {countryName ?? "Selected Country"}
              {countryCode ? ` (${countryCode})` : ""}
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
          </div>
          {metricsError ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{metricsError}</p> : null}
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
                  <p className="m-0 text-xs text-[#9eb7c8]">PIN</p>
                  <p className="m-0 mt-1 text-lg font-semibold">{formatCompact(metrics.cards.pin)}</p>
                </div>
                <div className="rounded-xl border border-[#2d4d61] bg-[#102433] p-2.5">
                  <p className="m-0 text-xs text-[#9eb7c8]">Funding</p>
                  <p className="m-0 mt-1 text-lg font-semibold">{formatCurrency(metrics.cards.funding)}</p>
                </div>
                <div className="rounded-xl border border-[#2d4d61] bg-[#102433] p-2.5">
                  <p className="m-0 text-xs text-[#9eb7c8]">PIN / Funding</p>
                  <p className="m-0 mt-1 text-lg font-semibold">{formatRatio(metrics.cards.pinFundingRatio)}</p>
                </div>
                <div className="rounded-xl border border-[#2d4d61] bg-[#102433] p-2.5">
                  <p className="m-0 text-xs text-[#9eb7c8]">Rank</p>
                  <p className="m-0 mt-1 text-lg font-semibold">#{metrics.cards.rank || "-"}</p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mb-4 flex-1 overflow-y-auto">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="m-0 text-sm uppercase tracking-[0.05em] text-[#b9ccda]">Genie Summary</h3>
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
            <p className="rounded-lg border border-[#2f5165] bg-[#102433] p-2 text-sm text-[#c7d8e4]">{progressLabel}</p>
          ) : null}

          {summaryError ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{summaryError}</p> : null}

          {summary?.summaryText ? (
            <p className="rounded-lg border border-[#2f5064] bg-[#102433] p-2.5 text-sm leading-6">{summary.summaryText}</p>
          ) : null}

          {summary?.keyDrivers?.length ? (
            <div className="mt-2">
              <p className="m-0 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Key Drivers</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[#dbe8f2]">
                {summary.keyDrivers.map((driver) => (
                  <li key={driver}>{driver}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {summary?.outliers?.length ? (
            <div className="mt-2">
              <p className="m-0 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Outliers</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[#dbe8f2]">
                {summary.outliers.map((outlier) => (
                  <li key={outlier}>{outlier}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {summary?.topList?.length ? (
            <div className="mt-3 rounded-xl border border-[#2f5064] bg-[#0f2130] p-2.5 text-sm">
              <p className="m-0 mb-1 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Top List</p>
              <ul className="m-0 list-none space-y-1 p-0">
                {summary.topList.slice(0, 10).map((item) => (
                  <li key={`${item.label}-${item.value}`} className="flex justify-between gap-2">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {rowTable ? (
            <div className="mt-3">
              <p className="m-0 mb-1 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Attachment Table</p>
              {rowTable}
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
