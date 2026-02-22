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
      className="rounded-2xl border border-[var(--dbx-border-soft)] bg-[var(--dbx-surface-raised)] p-4 text-[var(--dbx-text)]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
        Databricks Genie
      </p>
      <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">Databricks Genie (NLQ)</h2>
      <div className="flex flex-wrap gap-2">
        {queryTemplates.map((template) => (
          <button
            key={template}
            type="button"
            className="rounded-full border border-[var(--dbx-chip-border)] bg-[var(--dbx-chip-bg)] px-2.5 py-1 text-xs uppercase tracking-[0.08em] text-[var(--dbx-text-muted)]"
            onClick={() => onSetQuestion(template)}
          >
            Use Template
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="grid gap-2">
        <textarea
          className="w-full resize-y rounded-[10px] border border-[var(--dbx-input-border)] bg-[var(--dbx-input-bg)] px-3 py-2 text-sm text-[var(--dbx-text)]"
          value={question}
          onChange={(event) => onSetQuestion(event.target.value)}
          rows={3}
          placeholder="Ask a query (example: top overlooked crises by OCI)."
        />
        <button
          type="submit"
          className="inline-flex w-fit items-center justify-center rounded-[10px] border border-[var(--dbx-accent)] bg-[var(--dbx-accent)] px-3 py-2 text-sm font-semibold text-[#140a08] transition-colors hover:border-[var(--dbx-accent-soft)] hover:bg-[var(--dbx-accent-soft)] disabled:cursor-progress disabled:opacity-70"
          disabled={genieLoading}
        >
          {genieLoading ? "Loading..." : "Run Genie Query"}
        </button>
      </form>
      {genieLoading ? (
        <PanelLoading label="Querying Databricks Genie" rows={3} className="mt-1 border-t border-dashed border-[var(--dbx-border)] pt-2" />
      ) : genieAnswer ? (
        <div className="mt-1 border-t border-dashed border-[var(--dbx-border)] pt-2">
          <p>{genieAnswer}</p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
            Source: {genieSource ?? "mock"} • Globe highlights sync from query results.
          </p>
          {genieResults.length > 0 ? (
            <ul className="mt-2 grid list-none gap-1.5 p-0">
              {genieResults.slice(0, 3).map((row) => (
                <li
                  key={`${row.iso3}-${row.metric}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--dbx-list-border)] bg-[var(--dbx-list-bg)] px-2.5 py-2 text-sm"
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
