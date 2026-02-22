"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type SummaryBlockProps = {
  text: string;
  loading?: boolean;
};

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function emphasize(summary: string): string {
  return summary
    .replace(/\b(high|critical|severe|significantly overlooked)\b/gi, (value) => value.toUpperCase())
    .replace(/\b(low funding|underfunded|funding gap)\b/gi, (value) => value.toUpperCase());
}

export function SummaryBlock({ text, loading = false }: SummaryBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const { executive, details } = useMemo(() => {
    const sentences = splitSentences(text);
    return {
      executive: emphasize(sentences.slice(0, 3).join(" ")),
      details: sentences.join(" ")
    };
  }, [text]);

  if (loading) {
    return (
      <section className="rounded-xl border border-[#315671] bg-[#10283a] p-3">
        <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">What&apos;s happening</p>
        <p className="m-0 mt-2 text-sm text-[#d9e8f5]">Fetching executive summary from Genie...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#315671] bg-[#10283a] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-xs uppercase tracking-[0.07em] text-[#9eb9cb]">What&apos;s happening</p>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-1 text-xs text-[#cde3f2]"
        >
          {expanded ? (
            <>
              Hide details <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show details <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
      <p className="m-0 mt-2 text-sm leading-6 text-[#d9e8f5]">{executive || text}</p>
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          expanded ? "mt-2 max-h-52 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="m-0 text-sm leading-6 text-[#bcd4e6]">{details}</p>
      </div>
    </section>
  );
}

