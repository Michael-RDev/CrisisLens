import { callAiGateway, runSqlStatement } from "@/lib/databricks";
import { getCountryIsoMap, mapGeoError, mapRowToGeoMetrics, resolveIso3, type GeoMetrics } from "@/lib/geo-insight";

export type GeoQueryIntent = "compare" | "funding_up" | "funding_cut" | "solutions" | "general";

export type GeoQueryRow = {
  iso3: string;
  country: string;
  year: number;
  funding_coverage_ratio: number;
  coverage_pct: number;
  funding_gap_usd: number;
  funding_gap_per_person: number;
  people_in_need: number;
};

export type GeoQueryResult = {
  intent: GeoQueryIntent;
  headline: string;
  answer: string;
  recommendations: string[];
  followups: string[];
  rows: GeoQueryRow[];
  askedQuestion: string;
};

function getTable(): string {
  return process.env.CRISIS_TABLE_FQN?.trim() || "workspace.hdx.api_crisis_priority_2026";
}

function detectIntent(question: string): GeoQueryIntent {
  const q = question.toLowerCase();
  if (/(compare|versus|vs\b|lower than|higher than|rank|across countries|country has)/.test(q)) return "compare";
  if (/(where funding should be|allocate|increase funding|prioritize funding|more funding|invest)/.test(q)) return "funding_up";
  if (/(funding should be cut|cut funding|reduce funding|decrease funding|withdraw funding)/.test(q)) return "funding_cut";
  if (/(solution|recommend|what should we do|mitigation|intervention|action plan)/.test(q)) return "solutions";
  return "general";
}

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapGenericRow(row: Record<string, unknown>): GeoQueryRow {
  const coverageRatio = toNum(row.funding_coverage_ratio);
  return {
    iso3: String(row.iso3 ?? "").toUpperCase(),
    country: String(row.country ?? "Unknown"),
    year: Math.round(toNum(row.year)),
    funding_coverage_ratio: Number(coverageRatio.toFixed(4)),
    coverage_pct: Number((coverageRatio * 100).toFixed(1)),
    funding_gap_usd: toNum(row.funding_gap_usd),
    funding_gap_per_person: toNum(row.funding_gap_per_person),
    people_in_need: toNum(row.people_in_need)
  };
}

async function fetchRowsForIntent(intent: GeoQueryIntent): Promise<GeoQueryRow[]> {
  const table = getTable();
  const sqlByIntent: Record<GeoQueryIntent, string> = {
    compare: `SELECT iso3,country,year,people_in_need,funding_gap_usd,funding_gap_per_person,funding_coverage_ratio
              FROM ${table}
              ORDER BY year DESC, funding_gap_usd DESC
              LIMIT 40`,
    funding_up: `SELECT iso3,country,year,people_in_need,funding_gap_usd,funding_gap_per_person,funding_coverage_ratio
                 FROM ${table}
                 ORDER BY year DESC, funding_gap_per_person DESC
                 LIMIT 40`,
    funding_cut: `SELECT iso3,country,year,people_in_need,funding_gap_usd,funding_gap_per_person,funding_coverage_ratio
                  FROM ${table}
                  WHERE funding_coverage_ratio >= 0.65
                  ORDER BY year DESC, funding_gap_per_person ASC
                  LIMIT 40`,
    solutions: `SELECT iso3,country,year,people_in_need,funding_gap_usd,funding_gap_per_person,funding_coverage_ratio
                FROM ${table}
                ORDER BY year DESC, funding_gap_usd DESC
                LIMIT 40`,
    general: `SELECT iso3,country,year,people_in_need,funding_gap_usd,funding_gap_per_person,funding_coverage_ratio
              FROM ${table}
              ORDER BY year DESC, funding_gap_usd DESC
              LIMIT 30`
  };

  const rows = await runSqlStatement(sqlByIntent[intent]);
  return rows.map(mapGenericRow).filter((row) => row.iso3.length === 3);
}

function extractJson(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  if (trimmed.startsWith("{")) return trimmed;
  const s = trimmed.indexOf("{");
  const e = trimmed.lastIndexOf("}");
  if (s !== -1 && e > s) return trimmed.slice(s, e + 1);
  return null;
}

function defaultResult(question: string, intent: GeoQueryIntent, rows: GeoQueryRow[]): GeoQueryResult {
  return {
    intent,
    headline: "Strategic funding analysis generated from latest crisis metrics.",
    answer: "Use the ranked rows below to prioritize where funding should increase, where cuts are lower-risk, and where gap-per-person is most severe.",
    recommendations: [
      "Prioritize high gap-per-person countries with low coverage.",
      "Protect allocations in conflict-driven high-need contexts.",
      "Treat potential cuts as scenario analysis and validate with local operations."
    ],
    followups: [
      "Which top 5 countries need immediate funding increase?",
      "Which countries could absorb small cuts with lowest risk?",
      "How does this compare to last year?"
    ],
    rows: rows.slice(0, 10),
    askedQuestion: question
  };
}

function parseQueryResult(raw: string, question: string, intent: GeoQueryIntent, rows: GeoQueryRow[]): GeoQueryResult {
  const candidate = extractJson(raw);
  if (!candidate) return defaultResult(question, intent, rows);

  try {
    const parsed = JSON.parse(candidate) as {
      headline?: unknown;
      answer?: unknown;
      recommendations?: unknown;
      followups?: unknown;
    };

    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
      : [];
    const followups = Array.isArray(parsed.followups)
      ? parsed.followups.map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
      : [];

    const fallback = defaultResult(question, intent, rows);

    return {
      intent,
      headline: String(parsed.headline ?? "").trim() || fallback.headline,
      answer: String(parsed.answer ?? "").trim() || fallback.answer,
      recommendations: recommendations.length ? recommendations : fallback.recommendations,
      followups: followups.length ? followups : fallback.followups,
      rows: fallback.rows,
      askedQuestion: question
    };
  } catch {
    return defaultResult(question, intent, rows);
  }
}

function rowsToContext(rows: GeoQueryRow[]): string {
  return rows
    .slice(0, 18)
    .map(
      (row) =>
        `${row.country} (${row.iso3}) y${row.year}: coverage=${row.coverage_pct}%, gap_usd=${Math.round(
          row.funding_gap_usd
        )}, gap_per_person=${row.funding_gap_per_person.toFixed(2)}, pin=${Math.round(row.people_in_need)}`
    )
    .join("\n");
}

function buildMessages(input: {
  question: string;
  intent: GeoQueryIntent;
  rows: GeoQueryRow[];
  focusCountry?: GeoMetrics | null;
}) {
  const system = [
    "You are CrisisLens Strategic Funding Analyst.",
    "Answer with STRICT JSON only: { headline, answer, recommendations, followups }.",
    "recommendations: 3-4 bullets.",
    "followups: 3-4 actionable follow-up questions.",
    "When asked for comparisons or where to fund/cut, provide clear ranked guidance."
  ].join(" ");

  const focus = input.focusCountry
    ? `Selected country context: ${input.focusCountry.country} (${input.focusCountry.iso3}), coverage=${input.focusCountry.coverage_pct}%, gap_per_person=${input.focusCountry.funding_gap_per_person}.`
    : "No single country context provided.";

  const user = [
    `Intent: ${input.intent}`,
    `Question: ${input.question}`,
    focus,
    "Dataset sample rows:",
    rowsToContext(input.rows)
  ].join("\n");

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user }
  ];
}

async function resolveFocusCountry(question: string): Promise<GeoMetrics | null> {
  const map = await getCountryIsoMap();
  const lowered = question.toLowerCase();

  for (const [country, iso3] of map.entries()) {
    if (lowered.includes(country)) {
      const resolved = await resolveIso3({ iso3, country });
      const table = getTable();
      const rows = await runSqlStatement(
        `SELECT * FROM ${table} WHERE iso3 = :iso3 ORDER BY year DESC LIMIT 1`,
        { iso3: resolved }
      );
      if (rows[0]) return mapRowToGeoMetrics(rows[0]);
    }
  }

  return null;
}

export async function runGeoStrategicQuery(question: string): Promise<GeoQueryResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("question is required");
  }

  const intent = detectIntent(trimmed);
  const rows = await fetchRowsForIntent(intent);
  const focusCountry = await resolveFocusCountry(trimmed);
  const messages = buildMessages({
    question: trimmed,
    intent,
    rows,
    focusCountry
  });

  const raw = await callAiGateway(messages, 700);
  return parseQueryResult(raw, trimmed, intent, rows);
}

export { mapGeoError };
