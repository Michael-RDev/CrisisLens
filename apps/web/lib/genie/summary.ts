export type GenieTopListItem = {
  label: string;
  value: string;
  note?: string;
};

export type ParsedGenieSummary = {
  summaryText: string;
  keyDrivers: string[];
  outliers: string[];
  topList?: GenieTopListItem[];
};

export function buildCountrySummaryPrompt(input: {
  countryCode: string;
  countryName?: string;
  followUpQuestion?: string;
}): string {
  const code = input.countryCode.trim().toUpperCase();
  const nameLine = input.countryName?.trim() ? `country name: ${input.countryName.trim()}` : "country name: unknown";
  const followUp = input.followUpQuestion?.trim();

  const objective = followUp
    ? `Use this follow-up question to refine the response while keeping country context: ${followUp}`
    : "Produce an initial insight response for the selected country.";

  return [
    "You are an analyst for CrisisLens.",
    `Selected country code: ${code}`,
    nameLine,
    objective,
    "Focus on people in need versus funding levels and recent trend signals.",
    "Return ONLY valid JSON with this exact schema:",
    "{",
    '  "summarySentences": ["6 to 10 concise factual sentences"],',
    '  "keyDrivers": ["exactly 3 concise bullets"],',
    '  "outliers": ["exactly 2 anomalies or outliers, else \"None detected\" entries"],',
    '  "topList": [{ "label": "item", "value": "number or short value", "note": "optional context" }]',
    "}",
    "Do not include markdown fences or extra text."
  ].join("\n");
}

export function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1).trim();
  }

  return null;
}

function normalizeList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeTopList(value: unknown): GenieTopListItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const maybe = item as { label?: unknown; value?: unknown; note?: unknown };
      const label = String(maybe.label ?? "").trim();
      const rowValue = String(maybe.value ?? "").trim();
      const note = String(maybe.note ?? "").trim();
      if (!label || !rowValue) return null;
      return note ? { label, value: rowValue, note } : { label, value: rowValue };
    })
    .filter((row): row is GenieTopListItem => Boolean(row))
    .slice(0, 10);
}

export function parseGenieSummaryText(raw: string): ParsedGenieSummary {
  const jsonCandidate = extractJsonObject(raw);
  if (!jsonCandidate) {
    return {
      summaryText: raw.trim(),
      keyDrivers: [],
      outliers: []
    };
  }

  try {
    const parsed = JSON.parse(jsonCandidate) as {
      summarySentences?: unknown;
      keyDrivers?: unknown;
      outliers?: unknown;
      topList?: unknown;
      summary?: unknown;
    };

    const summarySentences = normalizeList(parsed.summarySentences, 10);
    const summaryFallback = String(parsed.summary ?? "").trim();
    const summaryText = summarySentences.length > 0 ? summarySentences.join(" ") : summaryFallback || raw.trim();
    const keyDrivers = normalizeList(parsed.keyDrivers, 3);
    const outliers = normalizeList(parsed.outliers, 2);
    const topList = normalizeTopList(parsed.topList);

    return {
      summaryText,
      keyDrivers,
      outliers,
      topList: topList.length > 0 ? topList : undefined
    };
  } catch {
    return {
      summaryText: raw.trim(),
      keyDrivers: [],
      outliers: []
    };
  }
}
