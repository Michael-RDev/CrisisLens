"use client";

import { KeyboardEvent, useEffect, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import type { AssistantMessage } from "@/components/command-center/tabs/insights-chat-utils";
import { isNearBottom } from "@/components/command-center/tabs/insights-chat-utils";

type AssistantTabProps = {
  question: string;
  loading: boolean;
  error: string | null;
  messages: AssistantMessage[];
  onQuestionChange: (value: string) => void;
  onSend: (question: string) => void;
  onClear: () => void;
};

function normalizeLines(lines: string[]): string[] {
  return lines.map((line) => line.trim()).filter(Boolean);
}

function splitSummary(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function dedupeSentences(text: string): string {
  const seen = new Set<string>();
  const deduped = splitSummary(text).filter((sentence) => {
    const key = sentence.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.join(" ");
}

function parseInlineBullets(text: string): string[] {
  return text
    .split(/\s-\s+/)
    .map((item) => item.trim())
    .filter((item) => Boolean(item) && /:|\$|%/.test(item))
    .slice(0, 6);
}

function formatTableCell(value: string | number | null): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "number") {
    if (Math.abs(value) >= 1_000_000) {
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1
      }).format(value);
    }
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return value;
}

export function AssistantTab({
  question,
  loading,
  error,
  messages,
  onQuestionChange,
  onSend,
  onClear
}: AssistantTabProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const element = textAreaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(220, Math.max(68, element.scrollHeight))}px`;
  }, [question]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    if (!autoScrollRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [loading, messages]);

  const hasMessages = messages.length > 0;
  function handleSend() {
    const next = question.trim();
    if (!next || loading) return;
    onSend(next);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div id="tabpanel-insights" role="tabpanel" aria-labelledby="tab-insights" className="flex h-full min-h-0 flex-col">
      <div
        ref={messageListRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
        onScroll={(event) => {
          const target = event.currentTarget;
          autoScrollRef.current = isNearBottom({
            scrollTop: target.scrollTop,
            clientHeight: target.clientHeight,
            scrollHeight: target.scrollHeight
          });
        }}
      >
        {!hasMessages ? (
          <div className="rounded-xl border border-[#2f526b] bg-[#10283a] p-3 text-sm text-[#d9e8f5]">
            Ask any question about countries, funding, rankings, or strategy. Results will appear here.
          </div>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-xl border p-3 ${
              message.role === "user"
                ? "ml-8 border-[#446a84] bg-[#12354d]"
                : "mr-8 border-[#315671] bg-[#10283a]"
            }`}
          >
            <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[#9fb9cb]">
              {message.role === "user" ? "You" : "Genie"}
            </p>
            {message.role === "assistant" ? (
              <>
                {message.result?.headline ? (
                  <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{message.result.headline}</p>
                ) : null}
                <div className="mt-2 space-y-2 text-sm leading-6 text-[#e3f1fb]">
                  {splitSummary(dedupeSentences(message.text)).slice(0, 4).map((sentence) => (
                    <p key={`${message.id}-${sentence}`} className="m-0">
                      {sentence}
                    </p>
                  ))}
                </div>

                {parseInlineBullets(message.text).length ? (
                  <section className="mt-2 rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
                    <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Key Data Points</p>
                    <ul className="m-0 mt-1.5 space-y-1.5 pl-4 text-sm text-[#d9e8f5]">
                      {parseInlineBullets(message.text).map((item) => (
                        <li key={`${message.id}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {message.result?.metricHighlights?.length ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {message.result.metricHighlights
                      .filter((item) => item.value !== "0" && item.value !== "$0")
                      .slice(0, 4)
                      .map((item) => (
                        <div key={`${message.id}-${item.label}`} className="rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
                          <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">{item.label}</p>
                          <p className="m-0 mt-1 text-sm font-semibold text-[#eff7ff]">{item.value}</p>
                        </div>
                      ))}
                  </div>
                ) : null}

                {message.result?.keyPoints?.length ? (
                  <section className="mt-2 rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
                    <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Summary Bullets</p>
                    <ul className="m-0 mt-1.5 space-y-1.5 pl-4 text-sm text-[#d9e8f5]">
                      {normalizeLines(message.result.keyPoints).slice(0, 3).map((item) => (
                        <li key={`${message.id}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {(() => {
                  const queryTable = message.result?.queryTable;
                  if (!queryTable || queryTable.rows.length <= 1) return null;
                  return (
                    <section className="mt-2 space-y-2 rounded-lg border border-[#2f526b] bg-[#0f2332] p-2">
                      <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">Comparative Table</p>
                      <div className="overflow-x-auto rounded border border-[#2a4a61]">
                        <table className="min-w-full border-collapse text-left text-xs text-[#d8e8f4]">
                          <thead className="bg-[#122d40]">
                            <tr>
                              {queryTable.columns.map((column) => (
                                <th key={`${message.id}-${column}`} className="px-2 py-1.5 font-semibold">
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryTable.rows.slice(0, 8).map((row, rowIndex) => (
                              <tr key={`${message.id}-row-${rowIndex}`} className="border-t border-[#24445a]">
                                {queryTable.columns.map((column) => (
                                  <td key={`${message.id}-${rowIndex}-${column}`} className="px-2 py-1.5 align-top">
                                    {formatTableCell(row[column] ?? null)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {queryTable.chart?.points?.length ? (
                        <div className="space-y-1.5 rounded border border-[#2a4a61] bg-[#0d1f2d] p-2">
                          <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#98b5c8]">
                            {queryTable.chart.valueLabel} (Quick Compare)
                          </p>
                          {(() => {
                            const points = queryTable.chart?.points ?? [];
                            const max = Math.max(...points.map((point) => point.value), 1);
                            return points.map((point) => (
                              <div key={`${message.id}-${point.label}`} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[11px] text-[#d4e6f4]">
                                  <span className="truncate pr-2">{point.label}</span>
                                  <span>{formatTableCell(point.value)}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[#1f3d52]">
                                  <div
                                    className="h-full rounded-full bg-[#64b7e8]"
                                    style={{ width: `${Math.max(8, (point.value / max) * 100).toFixed(1)}%` }}
                                    aria-hidden
                                  />
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : null}
                    </section>
                  );
                })()}
              </>
            ) : (
              <p className="m-0 mt-1 text-sm leading-6 text-[#e3f1fb] whitespace-pre-wrap">{message.text}</p>
            )}
          </article>
        ))}

        {loading ? (
          <article className="mr-8 rounded-xl border border-[#315671] bg-[#10283a] p-3">
            <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[#9fb9cb]">Genie</p>
            <p className="m-0 mt-1 inline-flex items-center gap-2 text-sm text-[#d9e8f5]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </p>
          </article>
        ) : null}

        {error ? <p className="rounded-lg border border-[#8a3d47] bg-[#3b1a22] p-2 text-sm">{error}</p> : null}
      </div>

      <div className="mt-3 shrink-0 rounded-xl border border-[#2f526b] bg-[#0f2232]/90 p-3 backdrop-blur">
        <label className="block text-xs uppercase tracking-[0.08em] text-[#9fb9cb]">Ask Insight</label>
        <textarea
          ref={textAreaRef}
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          onKeyDown={onComposerKeyDown}
          maxLength={700}
          placeholder="Ask any cross-country, strategy, or country question. Press Enter to send, Shift+Enter for newline."
          className="mt-1 w-full resize-none overflow-y-auto rounded-lg border border-[#355d79] bg-[#0d2333] px-3 py-2 text-sm text-[#eaf5ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7cd5ff]"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-[#95b1c4]">
          <span>{question.length}/700</span>
          <span>General query mode: ask cross-country or strategy questions.</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            disabled={loading || !question.trim()}
            onClick={handleSend}
            className="inline-flex items-center gap-1 rounded-lg border border-[#66b5e0] bg-[#155075] px-3 py-1.5 text-sm font-medium text-[#eef8ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="h-3.5 w-3.5" />
            {loading ? "Asking..." : "Send"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-[#4a6f88] bg-[#102a3c] px-3 py-1.5 text-sm text-[#d4e6f4]"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
