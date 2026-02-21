"use client";

import { FormEvent, useState } from "react";

type GenieRow = {
  iso3: string;
  metric: string;
  score: number;
  rationale?: string;
};

type DatabricksChatPopupProps = {
  queryTemplates: string[];
  question: string;
  genieAnswer: string;
  genieSource?: string;
  genieResults: GenieRow[];
  genieLoading: boolean;
  onSetQuestion: (question: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function DatabricksChatPopup({
  queryTemplates,
  question,
  genieAnswer,
  genieSource,
  genieResults,
  genieLoading,
  onSetQuestion,
  onSubmit
}: DatabricksChatPopupProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="dbx-chat-fab"
        onClick={() => setOpen(true)}
      >
        Open Databricks Chat
      </button>

      {open ? (
        <div className="dbx-modal-backdrop">
          <section
            className="dbx-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Databricks Chat"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="dbx-kicker">Databricks Genie</p>
                <h2 className="dbx-title">Databricks Chat</h2>
              </div>
              <button
                type="button"
                className="dbx-btn-secondary px-2 py-1 text-xs"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
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
                placeholder="Ask Databricks Genie..."
              />
              <button
                type="submit"
                className="dbx-btn-primary w-fit disabled:cursor-progress disabled:opacity-70"
                disabled={genieLoading}
              >
                {genieLoading ? "Querying..." : "Send"}
              </button>
            </form>
            {genieAnswer ? (
              <div className="dbx-divider mt-2 pt-2">
                <p>{genieAnswer}</p>
                <p className="dbx-subtitle mt-2">
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
          </section>
        </div>
      ) : null}
    </>
  );
}
