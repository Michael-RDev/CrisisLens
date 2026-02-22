type StructuredFields = {
  headline?: unknown;
  summary?: unknown;
  keyPoints?: unknown;
  key_points?: unknown;
  actions?: unknown;
  recommendations?: unknown;
  followups?: unknown;
  follow_ups?: unknown;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function stripMarkdownNoise(input: string): string {
  if (!input) return "";
  return normalizeWhitespace(
    input
      .replace(/```(?:json)?/gi, "")
      .replace(/`/g, "")
      .replace(/\*\*/g, "")
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
  );
}

function tryParseJson(raw: string): StructuredFields | null {
  try {
    return JSON.parse(raw) as StructuredFields;
  } catch {
    return null;
  }
}

function extractJsonObject(text: string): string | null {
  const cleaned = text.trim();
  if (!cleaned.includes("{")) return null;
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) return cleaned;

  const start = cleaned.indexOf("{");
  let depth = 0;
  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return null;
}

function toLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return toLines(value);
  }
  return [];
}

function uniqueCompact(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const normalized = normalizeWhitespace(item.replace(/^[\d.)]+\s*/, "").toLowerCase());
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(item.trim());
    if (out.length >= limit) break;
  }
  return out;
}

function splitSentences(text: string): string[] {
  return uniqueCompact(
    text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 8),
    12
  );
}

export type FormattedGenieResponse = {
  headline: string;
  summary: string;
  keyPoints: string[];
  actions: string[];
  followups: string[];
};

export function formatGenieNarrative(rawText: string): FormattedGenieResponse {
  const cleaned = stripMarkdownNoise(rawText);
  const jsonCandidate = extractJsonObject(cleaned);
  const parsed = jsonCandidate ? tryParseJson(jsonCandidate) : null;

  if (parsed) {
    const headline = typeof parsed.headline === "string" ? normalizeWhitespace(parsed.headline) : "";
    const summary = typeof parsed.summary === "string" ? normalizeWhitespace(parsed.summary) : "";
    const keyPoints = uniqueCompact(
      toStringArray(parsed.keyPoints ?? parsed.key_points),
      5
    );
    const actions = uniqueCompact(
      toStringArray(parsed.actions ?? parsed.recommendations),
      5
    );
    const followups = uniqueCompact(
      toStringArray(parsed.followups ?? parsed.follow_ups),
      5
    );

    if (headline || summary || keyPoints.length || actions.length || followups.length) {
      const fallbackHeadline = headline || splitSentences(summary)[0] || "Country insight";
      const fallbackSummary = summary || splitSentences(cleaned).slice(0, 3).join(" ");
      return {
        headline: fallbackHeadline,
        summary: fallbackSummary,
        keyPoints,
        actions,
        followups
      };
    }
  }

  const sections = cleaned.split(/(?:^|\s)(Recommendations?|Follow-?up Prompts?|Key Points?)\s*:?/i);
  let bodyText = cleaned;
  const recommendations: string[] = [];
  const followups: string[] = [];

  if (sections.length > 1) {
    bodyText = sections[0].trim();
    for (let i = 1; i < sections.length; i += 2) {
      const heading = sections[i]?.toLowerCase() ?? "";
      const content = sections[i + 1] ?? "";
      const lines = toLines(content);
      if (heading.includes("recommend")) recommendations.push(...lines);
      if (heading.includes("follow")) followups.push(...lines);
    }
  }

  const sentences = splitSentences(bodyText || cleaned);
  const headline = sentences[0] || "Insight generated";
  const summary = sentences.slice(1, 4).join(" ") || sentences[0] || "";
  const keyPoints = uniqueCompact(sentences.slice(1, 6), 4);

  return {
    headline,
    summary,
    keyPoints,
    actions: uniqueCompact(recommendations, 4),
    followups: uniqueCompact(followups, 4)
  };
}

