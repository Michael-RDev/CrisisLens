"use client";

import { FormEvent } from "react";
import { SectionCard } from "@/components/dashboard/ui-kit";

type GenieQueryPanelProps = {
  question: string;
  genieAnswer: string;
  genieSource?: string;
  genieResults: Array<{ iso3: string; metric: string; score: number; rationale?: string }>;
  genieLoading: boolean;
  onSetQuestion: (question: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function GenieQueryPanel({
  question,
  genieAnswer,
  genieSource,
  genieResults,
  genieLoading,
  onSetQuestion,
  onSubmit
}: GenieQueryPanelProps) {
  return (
    <SectionCard title="Legacy Genie Query" subtitle="Optional NLQ panel kept for compatibility">
      <form onSubmit={onSubmit} className="grid gap-2">
        <textarea
          className="w-full resize-y rounded-[10px] border border-[#2f5067] bg-[#0a1824] px-3 py-2 text-[#eaf3f8]"
          value={question}
          onChange={(event) => onSetQuestion(event.target.value)}
          rows={3}
          placeholder="Ask a legacy NLQ"
        />
        <button
          type="submit"
          className="w-fit rounded-lg border border-[#416986] bg-[#12344a] px-3 py-2 text-sm text-[#dbeaf2] disabled:opacity-70"
          disabled={genieLoading}
        >
          {genieLoading ? "Querying..." : "Run Genie Query"}
        </button>
      </form>

      {genieAnswer ? (
        <div className="mt-2 rounded-xl border border-[#2f5064] bg-[#0f2434] p-2.5 text-sm">
          <p className="m-0">{genieAnswer}</p>
          <p className="m-0 mt-1 text-xs text-[#9db7c8]">Source: {genieSource ?? "unknown"}</p>
          {genieResults.length ? (
            <ul className="mt-2 grid list-none gap-1 p-0 text-xs">
              {genieResults.slice(0, 3).map((row) => (
                <li key={`${row.iso3}-${row.metric}`} className="flex justify-between rounded border border-[#33566b] px-2 py-1">
                  <span>{row.iso3} • {row.metric}</span>
                  <strong>{row.score.toFixed(1)}</strong>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}
