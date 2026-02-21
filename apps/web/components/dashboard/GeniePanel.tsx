import { FormEvent } from "react";

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
            Source: {genieSource ?? "mock"} • Globe highlights sync from `highlight_iso3`.
          </p>
          {genieResults.length > 0 ? (
            <ul className="mt-2 grid list-none gap-1.5 p-0">
              {genieResults.slice(0, 3).map((row) => (
                <li
                  key={`${row.iso3}-${row.metric}`}
                  className="flex justify-between rounded-lg border border-[#2f5064] px-2.5 py-2 text-sm"
                >
                  <span>
                    {row.iso3} • {row.metric}
                    {row.rationale ? ` — ${row.rationale}` : ""}
                  </span>
                  <strong>{row.score.toFixed(1)}</strong>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
