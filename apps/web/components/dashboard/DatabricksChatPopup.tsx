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
        className="fixed bottom-5 right-5 z-20 rounded-full border border-[#4a6f87] bg-[#12344a] px-4 py-2 text-sm font-semibold text-[#eaf3f8] shadow-lg"
        onClick={() => setOpen(true)}
      >
        Open Databricks Chat
      </button>

      {open ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-[rgba(5,10,16,0.66)] p-4">
          <section
            className="w-full max-w-[620px] rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Databricks Chat"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="m-0 text-xl font-semibold">Databricks Chat</h2>
              <button
                type="button"
                className="rounded-md border border-[#415f75] bg-[#0d2434] px-2 py-1 text-xs text-[#d7e6f2]"
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
                placeholder="Ask Databricks Genie..."
              />
              <button
                type="submit"
                className="w-fit cursor-pointer rounded-lg border border-[#416986] bg-[#12344a] px-3 py-2 text-[#dbeaf2] disabled:cursor-progress disabled:opacity-70"
                disabled={genieLoading}
              >
                {genieLoading ? "Querying..." : "Send"}
              </button>
            </form>
            {genieAnswer ? (
              <div className="mt-2 border-t border-dashed border-[#35566f] pt-2">
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
          </section>
        </div>
      ) : null}
    </>
  );
}
