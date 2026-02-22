"use client";

import { FormEvent, useState } from "react";
import { PanelLoading } from "@/components/dashboard/PanelLoading";
import { countryByIso3 } from "@/lib/countries";

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
  const displayCountry = (iso3: string) => countryByIso3.get(iso3)?.name ?? iso3;

  return (
    <>
      <button
        type="button"
        className="fixed bottom-5 right-5 z-20 rounded-full border border-[var(--dbx-accent)] bg-[var(--dbx-chat-fab-bg)] px-4 py-2 text-sm font-semibold text-[var(--dbx-chat-fab-text)] shadow-lg transition-colors hover:border-[var(--dbx-accent-soft)] hover:bg-[var(--dbx-accent-soft)]"
        onClick={() => setOpen(true)}
      >
        Open Databricks Chat
      </button>

      {open ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-[var(--dbx-modal-backdrop)] p-4">
          <section
            className="w-full max-w-[680px] rounded-2xl border border-[var(--dbx-border)] bg-[var(--dbx-surface)] p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Databricks Chat"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="m-0 font-['IBM_Plex_Mono','SFMono-Regular',Menlo,monospace] text-xs uppercase tracking-[0.14em] text-[var(--dbx-accent-soft)]">
                  Databricks Genie
                </p>
                <h2 className="m-0 text-xl font-semibold text-[var(--dbx-text)]">Databricks Chat</h2>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[10px] border border-[var(--dbx-btn-secondary-border)] bg-[var(--dbx-btn-secondary-bg)] px-2 py-1 text-xs font-semibold text-[var(--dbx-btn-secondary-text)] transition-colors hover:border-[var(--dbx-cyan)] hover:text-[var(--dbx-text)]"
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
                placeholder="Ask Databricks Genie..."
              />
              <button
                type="submit"
                className="inline-flex w-fit items-center justify-center rounded-[10px] border border-[var(--dbx-accent)] bg-[var(--dbx-accent)] px-3 py-2 text-sm font-semibold text-[#140a08] transition-colors hover:border-[var(--dbx-accent-soft)] hover:bg-[var(--dbx-accent-soft)] disabled:cursor-progress disabled:opacity-70"
                disabled={genieLoading}
              >
                {genieLoading ? "Loading..." : "Send"}
              </button>
            </form>
            {genieLoading ? (
              <PanelLoading label="Querying Databricks chat" rows={3} className="mt-2 border-t border-dashed border-[var(--dbx-border)] pt-2" />
            ) : genieAnswer ? (
              <div className="mt-2 border-t border-dashed border-[var(--dbx-border)] pt-2">
                <p>{genieAnswer}</p>
                <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--dbx-text-muted)]">
                  Source: {genieSource ?? "genie"} • Globe highlights sync from query results.
                </p>
                {genieResults.length > 0 ? (
                  <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-[var(--dbx-list-border)]">
                    <table className="min-w-full border-collapse text-left text-xs text-[var(--dbx-text)]">
                      <thead className="sticky top-0 bg-[var(--dbx-list-bg)] text-[var(--dbx-text-muted)]">
                        <tr>
                          <th className="px-2 py-1.5">Country</th>
                          <th className="px-2 py-1.5">Metric</th>
                          <th className="px-2 py-1.5 text-right">Score</th>
                          <th className="px-2 py-1.5">Rationale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {genieResults.slice(0, 40).map((row, index) => (
                          <tr key={`${row.iso3}-${row.metric}-${index}`} className="border-t border-[var(--dbx-list-border)]">
                            <td className="px-2 py-1.5">{displayCountry(row.iso3)}</td>
                            <td className="px-2 py-1.5">{row.metric}</td>
                            <td className="px-2 py-1.5 text-right">{row.score.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-[var(--dbx-text-muted)]">{row.rationale ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
