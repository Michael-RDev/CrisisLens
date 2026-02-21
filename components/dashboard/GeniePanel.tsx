import { FormEvent } from "react";

type GeniePanelProps = {
  queryTemplates: string[];
  question: string;
  genieAnswer: string;
  genieLoading: boolean;
  onSetQuestion: (question: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function GeniePanel({
  queryTemplates,
  question,
  genieAnswer,
  genieLoading,
  onSetQuestion,
  onSubmit
}: GeniePanelProps) {
  return (
    <article className="integration-card glass">
      <h2>Databricks Genie (NLQ)</h2>
      <div className="template-row">
        {queryTemplates.map((template) => (
          <button key={template} type="button" onClick={() => onSetQuestion(template)}>
            Use Template
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="integration-form">
        <textarea
          value={question}
          onChange={(event) => onSetQuestion(event.target.value)}
          rows={3}
          placeholder="Ask a query (example: top overlooked crises by OCI)."
        />
        <button type="submit" disabled={genieLoading}>
          {genieLoading ? "Querying..." : "Run Genie Query"}
        </button>
      </form>
      {genieAnswer ? (
        <div className="integration-output">
          <p>{genieAnswer}</p>
          <p className="subtle">Globe highlights sync from `highlight_iso3`.</p>
        </div>
      ) : null}
    </article>
  );
}
