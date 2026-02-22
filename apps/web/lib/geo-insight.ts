import { DatabricksApiError, DatabricksMessage, callAiGateway, runSqlStatement } from "@/lib/databricks";

const COUNTRY_MAP_TTL_MS = 10 * 60 * 1000;

export type GeoMetrics = {
  iso3: string;
  country: string;
  year: number;
  people_in_need: number;
  people_targeted: number;
  funding_usd: number;
  requirements_usd: number;
  funding_gap_usd: number;
  funding_coverage_ratio: number;
  funding_gap_per_person: number;
  coverage_pct: number;
};

export type GeoInsight = {
  headline: string;
  summary: string;
  flags: string[];
  followups: string[];
};
export type GeoInsightSource = "ai" | "fallback";
export type GeoInsightResult = {
  insight: GeoInsight;
  source: GeoInsightSource;
};

export class NotFoundError extends Error {
  status = 404;
}

let countryIsoMapCache: { data: Map<string, string>; expiresAt: number } | null = null;

function getCrisisTableFqn(): string {
  return process.env.CRISIS_TABLE_FQN?.trim() || "workspace.new.crisislens_master";
}

function normalizeCountryName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isUnresolvedCountryColumnError(error: unknown): boolean {
  if (error instanceof DatabricksApiError) {
    const payload =
      typeof error.payload === "string" ? error.payload.toLowerCase() : JSON.stringify(error.payload).toLowerCase();
    return payload.includes("unresolved_column");
  }
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("unresolved_column");
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function mapRowToGeoMetrics(row: Record<string, unknown>): GeoMetrics {
  const iso3 = String(row.iso3 ?? "").trim().toUpperCase();
  const country = String(row.country ?? row.country_plan_name ?? row.country_name ?? iso3).trim();
  const year = Math.round(toNumber(row.year));

  const peopleInNeed = toNumber(row.people_in_need ?? row.total_people_in_need);
  const peopleTargeted = toNumber(row.people_targeted ?? row.total_people_targeted);
  const fundingUsd = toNumber(row.funding_usd ?? row.total_funding_usd);
  const requirementsUsd = toNumber(row.requirements_usd ?? row.total_requirements_usd);

  const fundingGapUsdRaw = row.funding_gap_usd;
  const fundingGapUsd =
    fundingGapUsdRaw === undefined || fundingGapUsdRaw === null
      ? Math.max(requirementsUsd - fundingUsd, 0)
      : toNumber(fundingGapUsdRaw);

  const fundingCoverageRatioRaw = row.funding_coverage_ratio;
  const fundingCoverageRatio =
    fundingCoverageRatioRaw === undefined || fundingCoverageRatioRaw === null
      ? requirementsUsd > 0
        ? fundingUsd / requirementsUsd
        : 0
      : toNumber(fundingCoverageRatioRaw);

  const coveragePctRaw = row.coverage_pct;
  const coveragePct =
    coveragePctRaw === undefined || coveragePctRaw === null
      ? round1(fundingCoverageRatio * 100)
      : round1(toNumber(coveragePctRaw));

  const fundingGapPerPersonRaw = row.funding_gap_per_person;
  const fundingGapPerPerson =
    fundingGapPerPersonRaw === undefined || fundingGapPerPersonRaw === null
      ? peopleInNeed > 0
        ? Number((fundingGapUsd / peopleInNeed).toFixed(2))
        : 0
      : Number(toNumber(fundingGapPerPersonRaw).toFixed(2));

  return {
    iso3,
    country,
    year,
    people_in_need: peopleInNeed,
    people_targeted: peopleTargeted,
    funding_usd: fundingUsd,
    requirements_usd: requirementsUsd,
    funding_gap_usd: fundingGapUsd,
    funding_coverage_ratio: Number(fundingCoverageRatio.toFixed(4)),
    funding_gap_per_person: fundingGapPerPerson,
    coverage_pct: coveragePct
  };
}

export async function getCountryIsoMap(): Promise<Map<string, string>> {
  if (countryIsoMapCache && Date.now() < countryIsoMapCache.expiresAt) {
    return countryIsoMapCache.data;
  }

  const table = getCrisisTableFqn();
  const buildCountryMapSql = (countryExpr: string) => `WITH latest_country AS (
       SELECT
         iso3,
         ${countryExpr} AS country,
         ROW_NUMBER() OVER (PARTITION BY iso3 ORDER BY year DESC) AS rn
       FROM ${table}
       WHERE iso3 IS NOT NULL
     )
     SELECT
       iso3,
       country
     FROM latest_country
     WHERE rn = 1 AND country IS NOT NULL`;

  const countryExprVariants = ["country_plan_name", "CAST(iso3 AS STRING)"] as const;
  let rows: Array<Record<string, unknown>> | null = null;
  let lastError: unknown = null;
  for (const countryExpr of countryExprVariants) {
    try {
      rows = await runSqlStatement(buildCountryMapSql(countryExpr));
      break;
    } catch (error) {
      lastError = error;
      if (!isUnresolvedCountryColumnError(error)) throw error;
    }
  }

  if (!rows) {
    throw (lastError ?? new Error("Unable to build country/iso3 map for all schema variants."));
  }

  const mapping = new Map<string, string>();
  rows.forEach((row) => {
    const iso3 = String(row.iso3 ?? "").trim().toUpperCase();
    const country = String(row.country ?? "").trim();
    if (!iso3 || iso3.length !== 3 || !country) return;
    mapping.set(normalizeCountryName(country), iso3);
  });

  countryIsoMapCache = {
    data: mapping,
    expiresAt: Date.now() + COUNTRY_MAP_TTL_MS
  };

  return mapping;
}

export function seedCountryIsoMapForTests(entries: Array<[string, string]>): void {
  countryIsoMapCache = {
    data: new Map(entries.map(([country, iso3]) => [normalizeCountryName(country), iso3])),
    expiresAt: Date.now() + COUNTRY_MAP_TTL_MS
  };
}

export async function resolveIso3(input: {
  iso3?: string | null;
  country?: string | null;
}): Promise<string> {
  const iso3 = input.iso3?.trim().toUpperCase();
  if (iso3 && /^[A-Z]{3}$/.test(iso3)) return iso3;

  const country = input.country?.trim();
  if (!country) {
    throw new Error("Either iso3 or country is required.");
  }

  const mapping = await getCountryIsoMap();
  const resolved = mapping.get(normalizeCountryName(country));
  if (!resolved) {
    throw new NotFoundError(`Country '${country}' not found in crisis table mapping.`);
  }

  return resolved;
}

export async function fetchGeoMetricsByIso3(iso3: string): Promise<GeoMetrics> {
  const normalized = iso3.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error("Invalid iso3; expected 3-letter code.");
  }

  const table = getCrisisTableFqn();
  const buildMetricsSql = (variant: {
    countryExpr: string;
    peopleInNeedColumn: "total_people_in_need";
    peopleTargetedColumn: "total_people_targeted";
    fundingColumn: "total_funding_usd";
    requirementsColumn: "total_requirements_usd";
    gapPerPersonColumn: "funding_gap_per_person_usd";
    coverageRatioExpr: string;
    coveragePctExpr: string;
  }) => `SELECT
       iso3,
       ${variant.countryExpr} AS country,
       year,
       COALESCE(${variant.peopleInNeedColumn}, 0) AS people_in_need,
       COALESCE(${variant.peopleTargetedColumn}, 0) AS people_targeted,
       COALESCE(${variant.fundingColumn}, 0) AS funding_usd,
       COALESCE(${variant.requirementsColumn}, 0) AS requirements_usd,
       COALESCE(funding_gap_usd, GREATEST(COALESCE(${variant.requirementsColumn}, 0) - COALESCE(${variant.fundingColumn}, 0), 0)) AS funding_gap_usd,
       COALESCE(
         ${variant.coverageRatioExpr},
         CASE
           WHEN COALESCE(${variant.requirementsColumn}, 0) = 0 THEN 0
           ELSE COALESCE(${variant.fundingColumn}, 0) / COALESCE(${variant.requirementsColumn}, 0)
         END
       ) AS funding_coverage_ratio,
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
       COALESCE(
         ${variant.coveragePctExpr},
         COALESCE(
           ${variant.coverageRatioExpr},
           CASE
             WHEN COALESCE(${variant.requirementsColumn}, 0) = 0 THEN 0
             ELSE COALESCE(${variant.fundingColumn}, 0) / COALESCE(${variant.requirementsColumn}, 0)
           END
         ) * 100
       ) AS coverage_pct
     FROM ${table}
     WHERE iso3 = :iso3
     ORDER BY year DESC
     LIMIT 1`;

  const variants = [
    {
      countryExpr: "country_plan_name",
      peopleInNeedColumn: "total_people_in_need",
      peopleTargetedColumn: "total_people_targeted",
      fundingColumn: "total_funding_usd",
      requirementsColumn: "total_requirements_usd",
      gapPerPersonColumn: "funding_gap_per_person_usd",
      coverageRatioExpr: "funding_coverage_pct / 100.0",
      coveragePctExpr: "funding_coverage_pct"
    },
    {
      countryExpr: "CAST(iso3 AS STRING)",
      peopleInNeedColumn: "total_people_in_need",
      peopleTargetedColumn: "total_people_targeted",
      fundingColumn: "total_funding_usd",
      requirementsColumn: "total_requirements_usd",
      gapPerPersonColumn: "funding_gap_per_person_usd",
      coverageRatioExpr: "funding_coverage_pct / 100.0",
      coveragePctExpr: "funding_coverage_pct"
    }
  ] as const;

  let rows: Array<Record<string, unknown>> | null = null;
  let lastError: unknown = null;
  for (const variant of variants) {
    try {
      rows = await runSqlStatement(buildMetricsSql(variant), { iso3: normalized });
      break;
    } catch (error) {
      lastError = error;
      if (!isUnresolvedCountryColumnError(error)) throw error;
    }
  }

  if (!rows) {
    throw (lastError ?? new Error("Unable to fetch geo metrics for all schema variants."));
  }

  if (!rows[0]) {
    throw new NotFoundError(`No crisis metrics found for ${normalized}.`);
  }

  return mapRowToGeoMetrics(rows[0]);
}

export function buildGeoInsightPrompt(metrics: GeoMetrics, question?: string): DatabricksMessage[] {
  const guidance = question?.trim()
    ? `Address this analyst follow-up while keeping context: ${question.trim()}`
    : "Provide an initial country geo-insight brief.";

  const system = [
    "You are CrisisLens Geo-Insight analyst.",
    "Return STRICT JSON only with keys: headline, summary, flags, followups.",
    "headline: 1 concise sentence.",
    "summary: 4-6 concise sentences in plain language.",
    "flags: array of exactly 3 short bullets.",
    "followups: array of exactly 3 relevant follow-up questions.",
    "Always mention coverage percentage and funding gap per person.",
    "Focus on underfunding, mismatch signals, and people-in-need implications.",
    "Use ONLY the provided metric values for any numbers.",
    "Do not invent numeric values, trends, or external facts.",
    "If a requested number is unavailable, state that it is not available in provided metrics."
  ].join(" ");

  const user = [
    guidance,
    `Country: ${metrics.country} (${metrics.iso3})`,
    `Year: ${metrics.year}`,
    `People in need: ${metrics.people_in_need}`,
    `People targeted: ${metrics.people_targeted}`,
    `Funding (USD): ${metrics.funding_usd}`,
    `Requirements (USD): ${metrics.requirements_usd}`,
    `Funding gap (USD): ${metrics.funding_gap_usd}`,
    `Coverage ratio: ${metrics.funding_coverage_ratio}`,
    `Coverage (%): ${metrics.coverage_pct}`,
    `Funding gap per person (USD): ${metrics.funding_gap_per_person}`
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

export function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  if (trimmed.startsWith("{")) return trimmed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return null;
}

function toStringArray(value: unknown, count: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, count);
}

function fallbackInsight(metrics: GeoMetrics): GeoInsightResult {
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  });
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  });

  return {
    source: "fallback",
    insight: {
      headline: `${metrics.country} (${metrics.iso3}) shows persistent underfunding pressure in ${metrics.year}.`,
      summary: `${compact.format(metrics.people_in_need)} people are in need while ${compact.format(
        metrics.people_targeted
      )} are targeted. Coverage is ${metrics.coverage_pct.toFixed(1)}% with ${money.format(
        metrics.funding_gap_usd
      )} still unmet. The funding gap per person is ${money.format(metrics.funding_gap_per_person)}.`,
      flags: [
        `Coverage remains at ${metrics.coverage_pct.toFixed(1)}%.`,
        `Funding gap per person is ${money.format(metrics.funding_gap_per_person)}.`,
        `${compact.format(metrics.people_in_need)} people remain in need.`
      ],
      followups: [
        "Which peer countries have similar gap-per-person values?",
        "What changed year-over-year in funding coverage?",
        "Which interventions could reduce unmet need fastest?"
      ]
    }
  };
}

export function parseGeoInsightResponse(raw: string, metrics: GeoMetrics): GeoInsightResult {
  const jsonCandidate = extractJsonObject(raw);
  if (!jsonCandidate) return fallbackInsight(metrics);

  try {
    const parsed = JSON.parse(jsonCandidate) as {
      headline?: unknown;
      summary?: unknown;
      flags?: unknown;
      followups?: unknown;
    };

    const headline = String(parsed.headline ?? "").trim();
    const summary = String(parsed.summary ?? "").trim();
    const flags = toStringArray(parsed.flags, 3);
    const followups = toStringArray(parsed.followups, 3);

    const fallback = fallbackInsight(metrics);

    return {
      source: "ai",
      insight: {
        headline: headline || fallback.insight.headline,
        summary: summary || fallback.insight.summary,
        flags: flags.length === 3 ? flags : fallback.insight.flags,
        followups: followups.length === 3 ? followups : fallback.insight.followups
      }
    };
  } catch {
    return fallbackInsight(metrics);
  }
}

export async function generateGeoInsight(metrics: GeoMetrics, question?: string): Promise<GeoInsightResult> {
  const messages = buildGeoInsightPrompt(metrics, question);
  const raw = await callAiGateway(messages, 550);
  return parseGeoInsightResponse(raw, metrics);
}

export function mapGeoError(error: unknown): { status: number; message: string } {
  if (error instanceof NotFoundError) {
    return { status: 404, message: error.message };
  }

  if (error instanceof DatabricksApiError) {
    const payloadText =
      typeof error.payload === "string"
        ? error.payload
        : error.payload
          ? JSON.stringify(error.payload)
          : "Unknown Databricks error";
    return {
      status: error.status >= 400 && error.status < 600 ? error.status : 502,
      message: `Databricks error: ${payloadText}`
    };
  }

  return {
    status: 500,
    message: error instanceof Error ? error.message : "Unexpected geo-insight error."
  };
}
