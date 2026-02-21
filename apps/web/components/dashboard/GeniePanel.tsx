import { FormEvent } from "react";
import { motion } from "framer-motion";
import { PanelLoading } from "@/components/dashboard/PanelLoading";
import { countryByIso3 } from "@/lib/countries";

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
  const displayCountry = (iso3: string) => countryByIso3.get(iso3)?.name ?? iso3;

  return (
    <motion.article
      className="integration-card dbx-panel-raised"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
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
          {genieLoading ? "Loading..." : "Run Genie Query"}
        </button>
      </form>
      {genieLoading ? (
        <PanelLoading label="Querying Databricks Genie" rows={3} className="dbx-divider mt-1 pt-2" />
      ) : genieAnswer ? (
        <div className="dbx-divider mt-1 pt-2">
          <p>{genieAnswer}</p>
          <p className="dbx-subtitle mt-1">
            Source: {genieSource ?? "mock"} • Globe highlights sync from query results.
          </p>
          {genieResults.length > 0 ? (
            <ul className="mt-2 grid list-none gap-1.5 p-0">
              {genieResults.slice(0, 3).map((row) => (
                <li
                  key={`${row.iso3}-${row.metric}`}
                  className="dbx-list-row"
                >
                  <span className="min-w-0 break-words">
                    {displayCountry(row.iso3)} • {row.metric}
                    {row.rationale ? ` — ${row.rationale}` : ""}
                  </span>
                  <strong className="shrink-0">{row.score.toFixed(1)}</strong>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </motion.article>
  );
}
