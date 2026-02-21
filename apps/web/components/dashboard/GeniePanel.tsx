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
    <article className="integration-card dbx-panel-raised">
      <p className="dbx-kicker">Databricks Genie</p>
      <h2 className="dbx-title">Databricks Genie (NLQ)</h2>
      <div className="flex flex-wrap gap-2">
        {queryTemplates.map((template) => (
          <button
            key={template}
            type="button"
            className="dbx-chip"
            onClick={() => onSetQuestion(template)}
          >
            Use Template
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="grid gap-2">
        <textarea
          className="dbx-textarea"
          value={question}
          onChange={(event) => onSetQuestion(event.target.value)}
          rows={3}
          placeholder="Ask a query (example: top overlooked crises by OCI)."
        />
        <button
          type="submit"
          className="dbx-btn-primary w-fit disabled:cursor-progress disabled:opacity-70"
          disabled={genieLoading}
        >
          {genieLoading ? "Querying..." : "Run Genie Query"}
        </button>
      </form>
      {genieLoading ? (
        <div className="dbx-loading dbx-divider mt-1 pt-2" role="status" aria-label="Querying Databricks Genie">
          <span className="dbx-loading-bar w-5/6" />
          <span className="dbx-loading-bar w-2/3" />
          {[0, 1, 2].map((idx) => (
            <div key={`genie-loading-${idx}`} className="dbx-loading-row">
              <span className="dbx-loading-bar w-4/5" />
              <span className="dbx-loading-bar w-12" />
            </div>
          ))}
        </div>
      ) : genieAnswer ? (
        <div className="dbx-divider mt-1 pt-2">
          <p>{genieAnswer}</p>
          <p className="dbx-subtitle mt-1">
            Source: {genieSource ?? "mock"} • Globe highlights sync from `highlight_iso3`.
          </p>
          {genieResults.length > 0 ? (
            <ul className="mt-2 grid list-none gap-1.5 p-0">
              {genieResults.slice(0, 3).map((row) => (
                <li
                  key={`${row.iso3}-${row.metric}`}
                  className="dbx-list-row"
                >
                  <span className="min-w-0 break-words">
                    {row.iso3} • {row.metric}
                    {row.rationale ? ` — ${row.rationale}` : ""}
                  </span>
                  <strong className="shrink-0">{row.score.toFixed(1)}</strong>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
