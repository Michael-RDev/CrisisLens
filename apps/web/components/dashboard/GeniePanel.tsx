import { FormEvent, useMemo, useState } from "react";

type GeniePanelProps = {
  queryTemplates: string[];
  question: string;
  genieAnswer: string;
  genieSource?: string;
  genieResults: Array<{
    iso3: string;
    metric: string;
    score: number;
    rationale?: string;
  }>;
  genieLoading: boolean;
  onSetQuestion: (question: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function GeniePanel({
  queryTemplates,
  question,
  genieAnswer,
  genieSource,
  genieResults,
  genieLoading,
  onSetQuestion,
  onSubmit
}: GeniePanelProps) {
  const [metricFilter, setMetricFilter] = useState<string>("all");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [hoveredResult, setHoveredResult] = useState<GeniePanelProps["genieResults"][number] | null>(null);
  const metrics = useMemo(
    () => [...new Set(genieResults.map((row) => row.metric).filter((metric) => metric.trim().length > 0))],
    [genieResults]
  );
  const filteredRows = useMemo(() => {
    if (metricFilter === "all") return genieResults;
    return genieResults.filter((row) => row.metric === metricFilter);
  }, [genieResults, metricFilter]);
  const topChartRows = useMemo(
    () => [...filteredRows].sort((a, b) => b.score - a.score).slice(0, 12),
    [filteredRows]
  );
  const maxScore = useMemo(() => Math.max(...topChartRows.map((row) => Math.abs(row.score)), 1), [topChartRows]);

  return (
    <article className="integration-card rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
      <h2 className="m-0 text-xl font-semibold">Databricks Genie (NLQ)</h2>
      <div className="flex flex-wrap gap-2">
        {queryTemplates.map((template) => (
          <button
            key={template}
            type="button"
            className="cursor-pointer rounded-full border border-[#4a6f87] bg-[#0f3044] px-2.5 py-1 text-xs text-[#d8e8f4]"
            onClick={() => onSetQuestion(template)}
          >
            Use Template
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="grid gap-2">
        <textarea
          className="w-full resize-y rounded-[9px] border border-[#2f5067] bg-[#0a1824] px-3 py-2 text-[#eaf3f8]"
          value={question}
          onChange={(event) => onSetQuestion(event.target.value)}
          rows={3}
          placeholder="Ask a query (example: top overlooked crises by OCI)."
        />
        <button
          type="submit"
          className="w-fit cursor-pointer rounded-lg border border-[#416986] bg-[#12344a] px-3 py-2 text-[#dbeaf2] disabled:cursor-progress disabled:opacity-70"
          disabled={genieLoading}
        >
          {genieLoading ? "Querying..." : "Run Genie Query"}
        </button>
      </form>
      {genieAnswer ? (
        <div className="mt-1 border-t border-dashed border-[#35566f] pt-2">
          <p>{genieAnswer}</p>
          <p className="text-sm text-[#9db7c8]">
            Source: {genieSource ?? "genie"} • Globe highlights sync from `highlight_iso3`.
          </p>
          {genieResults.length > 0 ? (
            <div className="mt-2 grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-[#a9c1d2]">Metric filter</label>
                <select
                  className="rounded-md border border-[#35566f] bg-[#0d1f2d] px-2 py-1 text-xs text-[#dce9f4]"
                  value={metricFilter}
                  onChange={(event) => setMetricFilter(event.target.value)}
                >
                  <option value="all">All metrics</option>
                  {metrics.map((metric) => (
                    <option key={metric} value={metric}>
                      {metric}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-[#9db7c8]">{filteredRows.length} rows</span>
              </div>

              <div className="rounded-lg border border-[#2f5064] bg-[#0c1b27] p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[#a9c1d2]">Genie Result Profile</p>
                  <p className="m-0 text-[11px] text-[#87afc8]">Hover bars for detail</p>
                </div>
                <div className="mt-2 grid gap-1.5">
                  {topChartRows.map((row, index) => {
                    const rowKey = `${row.iso3}-${row.metric}-${index}`;
                    const widthPct = Math.max(4, Math.round((Math.abs(row.score) / maxScore) * 100));
                    const isPositive = row.score >= 0;
                    const isHovered = hoveredKey === rowKey;
                    const gradient = isPositive
                      ? "from-[#7fd5ff] via-[#56b6e8] to-[#3da2d8]"
                      : "from-[#fca5a5] via-[#f87171] to-[#ef4444]";
                    return (
                      <div
                        key={rowKey}
                        className={`rounded border px-2 py-1.5 transition-colors ${
                          isHovered ? "border-[#7ec9ef] bg-[#102738]" : "border-[#28455a] bg-transparent"
                        }`}
                        onMouseEnter={() => {
                          setHoveredKey(rowKey);
                          setHoveredResult(row);
                        }}
                        onMouseLeave={() => {
                          setHoveredKey((current) => (current === rowKey ? null : current));
                          setHoveredResult((current) =>
                            current?.iso3 === row.iso3 && current?.metric === row.metric ? null : current
                          );
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#d8e8f4]">
                          <span>{index + 1}. {row.iso3} • {row.metric}</span>
                          <strong>{row.score.toFixed(2)}</strong>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-[#1b3547]">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${gradient} transition-all`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <p className="m-0 mt-1 text-[10px] text-[#9ec0d6]">
                          {row.rationale?.trim() ? row.rationale : "No rationale attached to this row."}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {hoveredResult ? (
                  <div className="mt-2 rounded-md border border-[#33556a] bg-[#0e2333] px-2 py-1.5 text-[11px] text-[#b7d0e1]">
                    <strong className="text-[#e6f2fb]">
                      {hoveredResult.iso3} • {hoveredResult.metric}
                    </strong>{" "}
                    {hoveredResult.rationale?.trim() ? hoveredResult.rationale : "No rationale provided by Genie for this result."}
                  </div>
                ) : null}
              </div>

              <div className="max-h-72 overflow-auto rounded-lg border border-[#2f5064]">
                <table className="min-w-full border-collapse text-left text-xs text-[#d8e8f4]">
                  <thead className="sticky top-0 bg-[#113047] text-[#b9d0e0]">
                    <tr>
                      <th className="px-2 py-1.5">ISO3</th>
                      <th className="px-2 py-1.5">Metric</th>
                      <th className="px-2 py-1.5 text-right">Score</th>
                      <th className="px-2 py-1.5">Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, index) => (
                      <tr
                        key={`${row.iso3}-${row.metric}-${index}`}
                        className="border-t border-[#244258] transition-colors hover:bg-[#123246]/65"
                        onMouseEnter={() => {
                          setHoveredKey(`${row.iso3}-${row.metric}-${index}`);
                          setHoveredResult(row);
                        }}
                        onMouseLeave={() => {
                          setHoveredKey((current) =>
                            current === `${row.iso3}-${row.metric}-${index}` ? null : current
                          );
                          setHoveredResult((current) =>
                            current?.iso3 === row.iso3 && current?.metric === row.metric ? null : current
                          );
                        }}
                      >
                        <td className="px-2 py-1.5">{row.iso3}</td>
                        <td className="px-2 py-1.5">{row.metric}</td>
                        <td className="px-2 py-1.5 text-right">{row.score.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-[#bdd2e0]">{row.rationale ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
