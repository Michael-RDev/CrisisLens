import { FormEvent } from "react";
import { GeoStrategicQueryResult } from "@/lib/api/crisiswatch";

type StrategicQueryPanelProps = {
  question: string;
  loading: boolean;
  error: string | null;
  result: GeoStrategicQueryResult | null;
  className?: string;
  onQuestionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseFollowup: (question: string) => void;
};

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

export function StrategicQueryPanel({
  question,
  loading,
  error,
  result,
  className,
  onQuestionChange,
  onSubmit,
  onUseFollowup
}: StrategicQueryPanelProps) {
  return (
    <article className={`integration-card rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4 ${className ?? ""}`}>
      <h2 className="m-0 text-xl font-semibold">General Query Assistant</h2>
      <p className="mt-1 text-sm text-[#9db7c8]">
        Ask any cross-country or strategy question: comparisons, where to increase funding, where to reduce, and
        intervention options.
      </p>

      <form onSubmit={onSubmit} className="grid gap-2">
        <textarea
          className="w-full resize-y rounded-[9px] border border-[#2f5067] bg-[#0a1824] px-3 py-2 text-[#eaf3f8]"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          rows={3}
          placeholder="Ask a general question (example: where should funding be increased this quarter?)"
        />
        <button
          type="submit"
          className="w-fit cursor-pointer rounded-lg border border-[#416986] bg-[#12344a] px-3 py-2 text-[#dbeaf2] disabled:opacity-70"
          disabled={loading || !question.trim()}
        >
          {loading ? "Analyzing..." : "Run Query"}
        </button>
      </form>

      {error ? <p className="mt-2 rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{error}</p> : null}

      {result ? (
        <div className="mt-2 max-h-[21rem] overflow-y-auto border-t border-dashed border-[#35566f] pt-2">
          <p className="m-0 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Intent: {result.intent}</p>
          <p className="mt-1 font-semibold">{result.headline}</p>
          <p className="text-sm text-[#dbe8f2]">{result.answer}</p>

          {result.recommendations.length ? (
            <div className="mt-2">
              <p className="m-0 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Recommendations</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[#dbe8f2]">
                {result.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.rows.length ? (
            <div className="mt-3 overflow-x-auto rounded-lg border border-[#2f5064]">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-[#0d1d29] text-[#b9ccda]">
                  <tr>
                    <th className="px-2 py-1.5">Country</th>
                    <th className="px-2 py-1.5">Coverage</th>
                    <th className="px-2 py-1.5">Gap / Person</th>
                    <th className="px-2 py-1.5">PIN</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 8).map((row) => (
                    <tr key={`${row.iso3}-${row.year}`} className="border-t border-[#203b4d] text-[#dce9f3]">
                      <td className="px-2 py-1.5">{row.country} ({row.iso3})</td>
                      <td className="px-2 py-1.5">{row.coverage_pct.toFixed(1)}%</td>
                      <td className="px-2 py-1.5">${row.funding_gap_per_person.toFixed(2)}</td>
                      <td className="px-2 py-1.5">{formatCompact(row.people_in_need)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {result.followups.length ? (
            <div className="mt-3">
              <p className="m-0 text-xs uppercase tracking-[0.05em] text-[#9eb8ca]">Follow-up Prompts</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {result.followups.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-full border border-[#3f6278] bg-[#133348] px-2.5 py-1 text-xs"
                    onClick={() => onUseFollowup(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
