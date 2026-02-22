"use client";

import { FormEvent } from "react";
import { Sparkles, Search, X } from "lucide-react";
import { GeoStrategicQueryResult } from "@/lib/api/crisiswatch";

const PROMPT_CHIPS = [
  "Most underfunded countries this year",
  "Where should funding increase for maximum impact?",
  "Countries with high PIN + low coverage"
];

type AssistantTabProps = {
  question: string;
  loading: boolean;
  error: string | null;
  result: GeoStrategicQueryResult | null;
  useSelectedCountry: boolean;
  selectedCountryLabel: string;
  onQuestionChange: (value: string) => void;
  onPromptFill: (value: string) => void;
  onToggleUseCountry: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  onUseFollowup: (question: string) => void;
};

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function averageCoverage(result: GeoStrategicQueryResult | null): string {
  if (!result?.rows.length) return "--";
  const total = result.rows.reduce((sum, row) => sum + row.coverage_pct, 0);
  return `${(total / result.rows.length).toFixed(1)}%`;
}

export function AssistantTab({
  question,
  loading,
  error,
  result,
  useSelectedCountry,
  selectedCountryLabel,
  onQuestionChange,
  onPromptFill,
  onToggleUseCountry,
  onSubmit,
  onClear,
  onUseFollowup
}: AssistantTabProps) {
  return (
    <div id="tabpanel-assistant" role="tabpanel" aria-labelledby="tab-assistant" className="space-y-3">
      <form onSubmit={onSubmit} className="space-y-2">
        <label className="block text-xs uppercase tracking-[0.08em] text-[#9fb9cb]">Query</label>
        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          rows={3}
          maxLength={420}
          placeholder="Ask a strategy question across countries and funding signals..."
          className="w-full resize-none rounded-xl border border-[#355d79] bg-[#0d2333] px-3 py-2 text-sm text-[#eaf5ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7cd5ff]"
        />
        <div className="flex items-center justify-between text-[11px] text-[#95b1c4]">
          <span>{question.length}/420</span>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={useSelectedCountry}
              onChange={(event) => onToggleUseCountry(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#4f7691] bg-[#0e2233]"
            />
            Use selected country ({selectedCountryLabel})
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PROMPT_CHIPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPromptFill(item)}
              className="rounded-full border border-[#3c6480] bg-[#13344a] px-2.5 py-1 text-[11px] text-[#d7e8f5] transition hover:border-[#67a2c8]"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-1 rounded-lg border border-[#66b5e0] bg-[#155075] px-3 py-1.5 text-sm font-medium text-[#eef8ff] disabled:opacity-60"
          >
            <Search className="h-3.5 w-3.5" />
            {loading ? "Running..." : "Run Query"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-[#4a6f88] bg-[#102a3c] px-3 py-1.5 text-sm text-[#d4e6f4]"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </form>

      {error ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{error}</p> : null}

      {result ? (
        <div className="space-y-3">
          <section className="rounded-xl border border-[#315671] bg-[#10283a] p-3">
            <p className="m-0 text-sm font-semibold text-[#ecf7ff]">{result.headline}</p>
            <ul className="mt-2 space-y-1 pl-5 text-sm text-[#d7e8f5]">
              {(result.keyPoints.length ? result.keyPoints : [result.answer]).slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Rows</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{result.rows.length}</p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Avg Coverage</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{averageCoverage(result)}</p>
            </div>
            <div className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
              <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Top PIN</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">
                {result.rows.length ? compact(result.rows[0].people_in_need) : "--"}
              </p>
            </div>
          </section>

          {result.rows.length ? (
            <section className="overflow-x-auto rounded-lg border border-[#2d526a] bg-[#0f2332]">
              <table className="min-w-[980px] text-left text-xs text-[#d6e5f1]">
                <thead className="border-b border-[#2d526a] bg-[#112d42] text-[#b7ccdc]">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Country</th>
                    <th className="px-2 py-1.5 font-semibold">OCI</th>
                    <th className="px-2 py-1.5 font-semibold">Coverage</th>
                    <th className="px-2 py-1.5 font-semibold">Total Gap</th>
                    <th className="px-2 py-1.5 font-semibold">PIN</th>
                    <th className="px-2 py-1.5 font-semibold">Status</th>
                    <th className="px-2 py-1.5 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={`${row.iso3}-${row.year}-${row.country}`} className="border-b border-[#1f3f55]">
                      <td className="px-2 py-1.5">{row.country} ({row.iso3})</td>
                      <td className="px-2 py-1.5">{typeof row.oci_score === "number" ? row.oci_score.toFixed(2) : "--"}</td>
                      <td className="px-2 py-1.5">{row.coverage_pct.toFixed(1)}%</td>
                      <td className="px-2 py-1.5">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          notation: "compact",
                          maximumFractionDigits: 1
                        }).format(Math.max(0, row.funding_gap_usd))}
                      </td>
                      <td className="px-2 py-1.5">{compact(row.people_in_need)}</td>
                      <td className="px-2 py-1.5">{row.crisis_status || "--"}</td>
                      <td className="px-2 py-1.5">{row.data_completeness_label || row.oci_variant || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {result.recommendations.length ? (
            <section className="grid gap-2">
              {result.recommendations.slice(0, 3).map((item, index) => (
                <article key={item} className="rounded-lg border border-[#2f526b] bg-[#10283a] p-2.5">
                  <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#9db9cb]">Action {index + 1}</p>
                  <p className="m-0 mt-1 text-sm text-[#d9e8f5]">{item}</p>
                </article>
              ))}
            </section>
          ) : null}

          {result.followups.length ? (
            <section>
              <p className="m-0 mb-1 text-xs uppercase tracking-[0.07em] text-[#9db9cb]">Follow-ups</p>
              <div className="flex flex-wrap gap-1.5">
                {result.followups.slice(0, 4).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onUseFollowup(item)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#416783] bg-[#13344a] px-2.5 py-1 text-[11px] text-[#dcebf7]"
                  >
                    <Sparkles className="h-3 w-3" />
                    {item}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
