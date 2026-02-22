import { DatabricksApiError, callAiGateway, runSqlStatement } from "@/lib/databricks";
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
  data_completeness?: string;
  severity_score?: number;
  vulnerability_score?: number;
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
  return process.env.CRISIS_TABLE_FQN?.trim() || "workspace.new.crisislens_master";
}

function detectIntent(question: string): GeoQueryIntent {
  const q = question.toLowerCase();
  if (/(compare|comparison|versus|vs\b|lower than|higher than|rank|ranking|across countries|country has)/.test(q)) {
    return "compare";
  }
  if (
    /(funding should be cut|cut funding|reduce funding|decrease funding|withdraw funding|reallocat|overfund|over-funded|doesn't need|doesnt need|don't need|dont need|do not need|too much funding|excess funding|can lose funding)/.test(
      q
    )
  ) {
    return "funding_cut";
  }
  if (/(where funding should be|allocate|increase funding|prioritize funding|more funding|invest)/.test(q)) {
    return "funding_up";
  }
  if (/(solution|recommend|what should we do|mitigation|intervention|action plan)/.test(q)) return "solutions";
  return "general";
}

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isUnresolvedColumnError(error: unknown): boolean {
  if (error instanceof DatabricksApiError) {
    const payload =
      typeof error.payload === "string" ? error.payload.toLowerCase() : JSON.stringify(error.payload).toLowerCase();
    return payload.includes("unresolved_column");
  }
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("unresolved_column");
}

function mapGenericRow(row: Record<string, unknown>): GeoQueryRow {
  const coverageRatio = toNum(row.funding_coverage_ratio);
  return {
    iso3: String(row.iso3 ?? "").toUpperCase(),
    country: String(row.country ?? row.country_plan_name ?? "Unknown"),
    year: Math.round(toNum(row.year)),
    funding_coverage_ratio: Number(coverageRatio.toFixed(4)),
    coverage_pct: Number((coverageRatio * 100).toFixed(1)),
    funding_gap_usd: toNum(row.funding_gap_usd),
    funding_gap_per_person: toNum(row.funding_gap_per_person),
    people_in_need: toNum(row.people_in_need ?? row.total_people_in_need),
    data_completeness: String(row.data_completeness ?? "").trim() || undefined,
    severity_score: toNum(row.severity_score),
    vulnerability_score: toNum(row.vulnerability_score)
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Math.max(0, value));
}

async function fetchRowsForIntent(intent: GeoQueryIntent): Promise<GeoQueryRow[]> {
  const table = getTable();
  const latestCountryCte = (variant: {
    countryExpr: string;
    peopleInNeedColumn: "total_people_in_need";
    fundingColumn: "total_funding_usd";
    requirementsColumn: "total_requirements_usd";
    gapPerPersonColumn: "funding_gap_per_person_usd";
    coverageRatioExpr: string;
    dataCompletenessColumn: string;
  }) => `
    WITH latest_country AS (
      SELECT
        iso3,
        ${variant.countryExpr} AS country,
        year,
        ${variant.peopleInNeedColumn} AS people_in_need,
        COALESCE(
          ${variant.coverageRatioExpr},
          CASE
            WHEN COALESCE(${variant.requirementsColumn}, 0) = 0 THEN 0
            ELSE COALESCE(${variant.fundingColumn}, 0) / COALESCE(${variant.requirementsColumn}, 0)
          END
        ) AS funding_coverage_ratio,
        COALESCE(
          funding_gap_usd,
          GREATEST(COALESCE(${variant.requirementsColumn}, 0) - COALESCE(${variant.fundingColumn}, 0), 0)
        ) AS funding_gap_usd,
        COALESCE(
          ${variant.gapPerPersonColumn},
          CASE
            WHEN COALESCE(${variant.peopleInNeedColumn}, 0) = 0 THEN 0
            ELSE COALESCE(
              funding_gap_usd,
              GREATEST(COALESCE(${variant.requirementsColumn}, 0) - COALESCE(${variant.fundingColumn}, 0), 0)
            ) / COALESCE(${variant.peopleInNeedColumn}, 0)
          END
        ) AS funding_gap_per_person,
        COALESCE(${variant.dataCompletenessColumn}, "") AS data_completeness,
        COALESCE(severity_score, 0) AS severity_score,
        COALESCE(vulnerability_score, 0) AS vulnerability_score,
        ROW_NUMBER() OVER (PARTITION BY iso3 ORDER BY year DESC) AS rn
      FROM ${table}
      WHERE iso3 IS NOT NULL
    )
  `;
  const sqlByIntent = (variant: {
    countryExpr: string;
    peopleInNeedColumn: "total_people_in_need";
    fundingColumn: "total_funding_usd";
    requirementsColumn: "total_requirements_usd";
    gapPerPersonColumn: "funding_gap_per_person_usd";
    coverageRatioExpr: string;
    dataCompletenessColumn: string;
  }): Record<GeoQueryIntent, string> => ({
    compare: `${latestCountryCte(variant)}
              SELECT
                iso3,
                country,
                year,
                COALESCE(people_in_need, 0) AS people_in_need,
                COALESCE(funding_gap_usd, 0) AS funding_gap_usd,
                COALESCE(funding_gap_per_person, 0) AS funding_gap_per_person,
                COALESCE(funding_coverage_ratio, 0) AS funding_coverage_ratio,
                data_completeness,
                severity_score,
                vulnerability_score
              FROM latest_country
              WHERE rn = 1 AND COALESCE(people_in_need, 0) > 0
              ORDER BY funding_gap_usd DESC
              LIMIT 40`,
    funding_up: `${latestCountryCte(variant)}
                 SELECT
                   iso3,
                   country,
                   year,
                   COALESCE(people_in_need, 0) AS people_in_need,
                   COALESCE(funding_gap_usd, 0) AS funding_gap_usd,
                   COALESCE(funding_gap_per_person, 0) AS funding_gap_per_person,
                   COALESCE(funding_coverage_ratio, 0) AS funding_coverage_ratio,
                   data_completeness,
                   severity_score,
                   vulnerability_score
                 FROM latest_country
                 WHERE rn = 1 AND COALESCE(people_in_need, 0) > 0
                 ORDER BY funding_gap_per_person DESC
                 LIMIT 40`,
    funding_cut: `${latestCountryCte(variant)}
                  SELECT
                    iso3,
                    country,
                    year,
                    COALESCE(people_in_need, 0) AS people_in_need,
                    COALESCE(funding_gap_usd, 0) AS funding_gap_usd,
                    COALESCE(funding_gap_per_person, 0) AS funding_gap_per_person,
                    COALESCE(funding_coverage_ratio, 0) AS funding_coverage_ratio,
                    data_completeness,
                    severity_score,
                    vulnerability_score
                  FROM latest_country
                  WHERE rn = 1
                    AND COALESCE(people_in_need, 0) > 0
                    AND LOWER(COALESCE(data_completeness, "")) LIKE "complete%"
                  ORDER BY funding_coverage_ratio DESC, funding_gap_per_person ASC, funding_gap_usd ASC
                  LIMIT 60`,
    solutions: `${latestCountryCte(variant)}
                SELECT
                  iso3,
                  country,
                  year,
                  COALESCE(people_in_need, 0) AS people_in_need,
                  COALESCE(funding_gap_usd, 0) AS funding_gap_usd,
                  COALESCE(funding_gap_per_person, 0) AS funding_gap_per_person,
                  COALESCE(funding_coverage_ratio, 0) AS funding_coverage_ratio,
                  data_completeness,
                  severity_score,
                  vulnerability_score
                FROM latest_country
                WHERE rn = 1 AND COALESCE(people_in_need, 0) > 0
                ORDER BY funding_gap_usd DESC
                LIMIT 40`,
    general: `${latestCountryCte(variant)}
              SELECT
                iso3,
                country,
                year,
                COALESCE(people_in_need, 0) AS people_in_need,
                COALESCE(funding_gap_usd, 0) AS funding_gap_usd,
                COALESCE(funding_gap_per_person, 0) AS funding_gap_per_person,
                COALESCE(funding_coverage_ratio, 0) AS funding_coverage_ratio,
                data_completeness,
                severity_score,
                vulnerability_score
              FROM latest_country
              WHERE rn = 1 AND COALESCE(people_in_need, 0) > 0
              ORDER BY funding_gap_usd DESC
              LIMIT 30`
  });

  const variants = [
    {
      countryExpr: "country_plan_name",
      peopleInNeedColumn: "total_people_in_need",
      fundingColumn: "total_funding_usd",
      requirementsColumn: "total_requirements_usd",
      gapPerPersonColumn: "funding_gap_per_person_usd",
      coverageRatioExpr: "funding_coverage_pct / 100.0",
      dataCompletenessColumn: "data_completeness"
    },
    {
      countryExpr: "CAST(iso3 AS STRING)",
      peopleInNeedColumn: "total_people_in_need",
      fundingColumn: "total_funding_usd",
      requirementsColumn: "total_requirements_usd",
      gapPerPersonColumn: "funding_gap_per_person_usd",
      coverageRatioExpr: "funding_coverage_pct / 100.0",
      dataCompletenessColumn: "data_completeness"
    },
    {
      countryExpr: "country_plan_name",
      peopleInNeedColumn: "total_people_in_need",
      fundingColumn: "total_funding_usd",
      requirementsColumn: "total_requirements_usd",
      gapPerPersonColumn: "funding_gap_per_person_usd",
      coverageRatioExpr: "funding_coverage_pct / 100.0",
      dataCompletenessColumn: "data_completeness_label"
    },
    {
      countryExpr: "CAST(iso3 AS STRING)",
      peopleInNeedColumn: "total_people_in_need",
      fundingColumn: "total_funding_usd",
      requirementsColumn: "total_requirements_usd",
      gapPerPersonColumn: "funding_gap_per_person_usd",
      coverageRatioExpr: "funding_coverage_pct / 100.0",
      dataCompletenessColumn: "data_completeness_label"
    }
  ] as const;

  let rows: Array<Record<string, unknown>> | null = null;
  let lastError: unknown = null;
  for (const variant of variants) {
    try {
      rows = await runSqlStatement(sqlByIntent(variant)[intent]);
      break;
    } catch (error) {
      lastError = error;
      if (!isUnresolvedColumnError(error)) throw error;
    }
  }

  if (!rows) {
    throw (lastError ?? new Error("Unable to run geo query for all schema variants."));
  }
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

function parseAiResult(raw: string): {
  headline?: string;
  answer?: string;
  recommendations: string[];
  followups: string[];
} | null {
  const candidate = extractJson(raw);
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as {
      headline?: unknown;
      answer?: unknown;
      recommendations?: unknown;
      followups?: unknown;
    };
    const headline = String(parsed.headline ?? "").trim() || undefined;
    const answer = String(parsed.answer ?? "").trim() || undefined;
    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
      : [];
    const followups = Array.isArray(parsed.followups)
      ? parsed.followups.map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
      : [];
    if (!headline && !answer && !recommendations.length && !followups.length) return null;
    return { headline, answer, recommendations, followups };
  } catch {
    return null;
  }
}

function buildDeterministicResult(
  question: string,
  intent: GeoQueryIntent,
  rows: GeoQueryRow[],
  focusCountry?: GeoMetrics | null
): GeoQueryResult {
  const topRows = rows.slice(0, 10);
  if (!topRows.length) return defaultResult(question, intent, rows);

  const byGap = [...rows].sort((a, b) => b.funding_gap_usd - a.funding_gap_usd);
  const byCoverage = [...rows].sort((a, b) => a.coverage_pct - b.coverage_pct);
  const byGapPerPerson = [...rows].sort((a, b) => b.funding_gap_per_person - a.funding_gap_per_person);
  const byPin = [...rows].sort((a, b) => b.people_in_need - a.people_in_need);

  const topGap = byGap[0];
  const lowCoverage = byCoverage[0];
  const highCoverage = [...byCoverage].reverse()[0];
  const topGapPerPerson = byGapPerPerson[0];
  const topPin = byPin[0];

  const headlineByIntent: Record<GeoQueryIntent, string> = {
    compare: `Verified comparison across ${rows.length} countries (${topGap.year}).`,
    funding_up: `Verified funding-increase priorities for ${topGap.year}.`,
    funding_cut: `Verified reallocation candidates for ${topGap.year} (donors + recipients).`,
    solutions: `Verified crisis funding pressure profile for ${topGap.year}.`,
    general: `Verified cross-country funding snapshot for ${topGap.year}.`
  };

  const focusLine = focusCountry
    ? ` Focus country ${focusCountry.country} (${focusCountry.iso3}) has ${focusCountry.coverage_pct.toFixed(
        1
      )}% coverage and ${formatCurrency(focusCountry.funding_gap_per_person)} gap per person.`
    : "";

  let answer = [
    `${topGap.country} (${topGap.iso3}) has the largest funding gap at ${formatCurrency(topGap.funding_gap_usd)}.`,
    `${lowCoverage.country} (${lowCoverage.iso3}) has the lowest coverage at ${lowCoverage.coverage_pct.toFixed(1)}%.`,
    `${topGapPerPerson.country} (${topGapPerPerson.iso3}) has the highest gap per person at ${formatCurrency(
      topGapPerPerson.funding_gap_per_person
    )}.`,
    `${topPin.country} (${topPin.iso3}) has the highest people in need at ${formatCompact(topPin.people_in_need)}.`,
    `Highest observed coverage in this set is ${highCoverage.coverage_pct.toFixed(1)}% (${highCoverage.country} ${
      highCoverage.iso3
    }).${focusLine}`
  ].join(" ");

  if (intent === "funding_cut") {
    const donors = [...rows]
      .sort((a, b) => b.coverage_pct - a.coverage_pct || a.funding_gap_per_person - b.funding_gap_per_person)
      .slice(0, 3);
    const recipients = [...rows]
      .sort((a, b) => b.funding_gap_per_person - a.funding_gap_per_person || a.coverage_pct - b.coverage_pct)
      .slice(0, 3);

    const donorText = donors
      .map((row) => `${row.country} (${row.iso3})`)
      .join(", ");
    const recipientText = recipients
      .map((row) => `${row.country} (${row.iso3})`)
      .join(", ");

    answer = [
      `Potential lower-priority funding-holding countries (relative, not absolute): ${donorText}.`,
      `Potential higher-priority recipients: ${recipientText}.`,
      `${highCoverage.country} (${highCoverage.iso3}) currently has the highest coverage at ${highCoverage.coverage_pct.toFixed(
        1
      )}%, while ${topGapPerPerson.country} (${topGapPerPerson.iso3}) has the highest per-person gap at ${formatCurrency(
        topGapPerPerson.funding_gap_per_person
      )}.`,
      `Use this as reallocation screening only; validate operational and protection constraints before cuts.${focusLine}`
    ].join(" ");
  }

  const recommendationsByIntent: Record<GeoQueryIntent, string[]> = {
    compare: [
      "Prioritize countries with both low coverage and high gap-per-person.",
      "Use people-in-need volume to phase funding releases by operational capacity.",
      "Track changes monthly to validate rank movement before reallocating."
    ],
    funding_up: [
      "Increase allocations first where gap-per-person is highest and coverage is lowest.",
      "Protect high people-in-need countries from additional shortfalls.",
      "Re-check delivery constraints before scaling allocations."
    ],
    funding_cut: [
      "Screen for possible donors using higher coverage plus lower gap-per-person together.",
      "Apply small staged reductions and monitor outcome signals.",
      "Avoid cuts in countries with very high people in need or low coverage."
    ],
    solutions: [
      "Pair funding increases with sector-level targeting in high-gap countries.",
      "Review delivery bottlenecks in countries with persistent low coverage.",
      "Use per-person gap and PIN together to sequence interventions."
    ],
    general: [
      "Treat low coverage plus high gap-per-person as primary escalation criteria.",
      "Use people-in-need to estimate scale and absorption requirements.",
      "Re-evaluate rankings each refresh cycle to avoid stale allocations."
    ]
  };

  const followupsByIntent: Record<GeoQueryIntent, string[]> = {
    compare: [
      "Which countries are below 10% coverage this year?",
      "Show top 5 by funding gap per person.",
      "How did the top gap countries change from last year?"
    ],
    funding_up: [
      "Which top 5 countries should receive incremental funding first?",
      "What is the marginal impact of increasing funding by 10% in top-priority countries?",
      "Which sectors drive the highest unmet need in these countries?"
    ],
    funding_cut: [
      "Which countries remain above 30% coverage after a 5% cut?",
      "What is the risk delta if cuts are applied to current higher-coverage countries?",
      "Which countries should be explicitly excluded from cuts?"
    ],
    solutions: [
      "Which interventions reduce gap-per-person fastest in top-gap countries?",
      "Where should funding be paired with logistics support?",
      "Which countries have persistent low coverage despite high funding?"
    ],
    general: [
      "Show countries with lowest coverage and highest gap-per-person.",
      "Which countries are improving coverage quarter over quarter?",
      "Where should funding be rebalanced for maximum impact?"
    ]
  };

  return {
    intent,
    headline: headlineByIntent[intent],
    answer,
    recommendations: recommendationsByIntent[intent],
    followups: followupsByIntent[intent],
    rows: topRows,
    askedQuestion: question
  };
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
    "Directly answer the user's exact question.",
    "recommendations: 3-4 bullets.",
    "followups: 3-4 actionable follow-up questions.",
    "When asked for comparisons or where to fund/cut, provide clear ranked guidance.",
    "Use only dataset rows supplied in context.",
    "Do not introduce invented numeric values or unsupported factual claims.",
    "If data is insufficient, state that clearly and provide the closest supported answer."
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
  const deterministic = buildDeterministicResult(trimmed, intent, rows, focusCountry);
  const messages = buildMessages({
    question: trimmed,
    intent,
    rows,
    focusCountry
  });

  try {
    const raw = await callAiGateway(messages, 700);
    const aiResult = parseAiResult(raw);
    if (!aiResult) return deterministic;
    return {
      ...deterministic,
      headline: aiResult.headline ?? deterministic.headline,
      answer: aiResult.answer ?? deterministic.answer,
      recommendations: aiResult.recommendations.length ? aiResult.recommendations : deterministic.recommendations,
      followups: aiResult.followups.length ? aiResult.followups : deterministic.followups
    };
  } catch (error) {
    console.error("Geo strategic AI generation failed, returning SQL fallback.", {
      intent,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return deterministic;
  }
}

export { mapGeoError };
