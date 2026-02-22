"use client";

type GenieQueryResult = {
  columns: string[];
  rows: unknown[][];
  rowCount?: number;
};

type InsightPanelProps = {
  open: boolean;
  countryCode?: string;
  countryName?: string;
  loading: boolean;
  error: string | null;
  summaryText: string;
  formatted: {
    headline: string;
    summary: string;
    keyPoints: string[];
    actions: string[];
    followups: string[];
    metricHighlights?: Array<{ label: string; value: string }>;
  } | null;
  queryResult: GenieQueryResult | null;
  onRetry: () => void;
};

export default function InsightPanel({
  open,
  countryCode,
  countryName,
  loading,
  error,
  summaryText,
  formatted,
  queryResult,
  onRetry
}: InsightPanelProps) {
  if (!open) {
    return (
      <section className="rounded-2xl border border-[#204764] bg-[linear-gradient(145deg,#102b3f,#0a1a27)] p-4">
        <p className="m-0 text-sm text-[#a7c3d6]">Pinch or click a country to load Genie insight.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#204764] bg-[linear-gradient(145deg,#102b3f,#0a1a27)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="m-0 text-lg font-semibold text-[#ecf6ff]">Insight Panel</h3>
          <p className="m-0 text-xs text-[#9bb7ca]">
            {countryName ?? "Unknown"} {countryCode ? `(${countryCode})` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-[#44657c] bg-[#0f2b40] px-3 py-1 text-xs text-[#dbe9f5]"
          disabled={loading}
        >
          Retry
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 animate-pulse rounded bg-[#1d4057]" />
          <div className="h-4 animate-pulse rounded bg-[#1d4057]" />
          <div className="h-4 animate-pulse rounded bg-[#1d4057]" />
        </div>
      ) : null}

      {error ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="rounded-lg border border-[#2d526a] bg-[#102433] p-3">
            <p className="m-0 text-base font-semibold text-[#eff7ff]">
              {formatted?.headline || "Country insight"}
            </p>
            {formatted?.metricHighlights?.length ? (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {formatted.metricHighlights.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-md border border-[#355d78] bg-[#0d1f2c] px-2 py-1"
                  >
                    <p className="m-0 text-[11px] uppercase tracking-[0.05em] text-[#98b6ca]">{item.label}</p>
                    <p className="m-0 text-sm font-semibold text-[#e9f4fc]">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="m-0 mt-2 text-sm leading-6 text-[#d8e7f2]">
              {formatted?.summary || summaryText || "No summary text returned from Genie."}
            </p>
            {formatted?.keyPoints?.length ? (
              <ul className="m-0 mt-2 list-disc space-y-1 pl-5 text-sm text-[#d8e7f2]">
                {formatted.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
            {formatted?.actions?.length ? (
              <div className="mt-2">
                <p className="m-0 text-xs uppercase tracking-[0.05em] text-[#9db8cb]">Recommended Actions</p>
                <ul className="m-0 mt-1 list-disc space-y-1 pl-5 text-sm text-[#d8e7f2]">
                  {formatted.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {queryResult && queryResult.columns.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-lg border border-[#2d526a] bg-[#0f2332]">
              <table className="min-w-full text-left text-xs text-[#d6e5f1]">
                <thead className="border-b border-[#2d526a] bg-[#112d42] text-[#b7ccdc]">
                  <tr>
                    {queryResult.columns.map((column) => (
                      <th key={column} className="px-2 py-1.5 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.slice(0, 25).map((row, idx) => (
                    <tr key={idx} className="border-b border-[#1f3f55]">
                      {Array.isArray(row)
                        ? row.map((value, valueIdx) => (
                            <td key={`${idx}-${valueIdx}`} className="px-2 py-1.5">
                              {String(value ?? "")}
                            </td>
                          ))
                        : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="m-0 px-2 py-1.5 text-[11px] text-[#9ab8cb]">
                Showing up to 25 rows{typeof queryResult.rowCount === "number" ? ` of ${queryResult.rowCount}` : ""}.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
