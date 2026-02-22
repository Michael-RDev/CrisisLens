import { runSqlStatement } from "@/lib/databricks";

export type LatestCountryRow = {
  iso3: string;
  country: string;
  year: number;
  people_in_need: number;
  funding_gap_usd: number;
  funding_gap_per_person_usd: number;
  funding_coverage_pct: number;
  severity_score: number;
  overlooked_crisis_index: number;
  pooled_funding_usd: number;
};

function toNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isUnresolvedColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("unresolved_column");
}

function getTable(): string {
  return process.env.CRISIS_TABLE_FQN?.trim() || "workspace.new.crisislens_master";
}

export async function fetchLatestCountryRows(): Promise<LatestCountryRow[]> {
  const table = getTable();

  const buildQuery = (variant: {
    countryExpr: string;
    peopleInNeedColumn: string;
    fundingColumn: string;
    requirementsColumn: string;
    pooledFundingColumn: string;
  }) => `
    WITH latest_country AS (
      SELECT
        iso3,
        ${variant.countryExpr} AS country,
        year,
        COALESCE(${variant.peopleInNeedColumn}, 0) AS people_in_need,
        COALESCE(${variant.fundingColumn}, 0) AS funding_usd,
        COALESCE(${variant.requirementsColumn}, 0) AS requirements_usd,
        COALESCE(
          funding_gap_usd,
          GREATEST(COALESCE(${variant.requirementsColumn}, 0) - COALESCE(${variant.fundingColumn}, 0), 0)
        ) AS funding_gap_usd,
        COALESCE(
          funding_gap_per_person_usd,
          CASE
            WHEN COALESCE(${variant.peopleInNeedColumn}, 0) = 0 THEN 0
            ELSE COALESCE(
              funding_gap_usd,
              GREATEST(COALESCE(${variant.requirementsColumn}, 0) - COALESCE(${variant.fundingColumn}, 0), 0)
            ) / COALESCE(${variant.peopleInNeedColumn}, 0)
          END
        ) AS funding_gap_per_person_usd,
        COALESCE(
          funding_coverage_pct,
          CASE
            WHEN COALESCE(${variant.requirementsColumn}, 0) = 0 THEN 0
            ELSE (COALESCE(${variant.fundingColumn}, 0) / COALESCE(${variant.requirementsColumn}, 0)) * 100
          END
        ) AS funding_coverage_pct,
        COALESCE(severity_score, 0) AS severity_score,
        COALESCE(overlooked_crisis_index, 0) AS overlooked_crisis_index,
        COALESCE(${variant.pooledFundingColumn}, COALESCE(${variant.fundingColumn}, 0)) AS pooled_funding_usd,
        ROW_NUMBER() OVER (PARTITION BY iso3 ORDER BY year DESC) AS rn
      FROM ${table}
      WHERE iso3 IS NOT NULL
    )
    SELECT
      iso3,
      country,
      year,
      people_in_need,
      funding_gap_usd,
      funding_gap_per_person_usd,
      funding_coverage_pct,
      severity_score,
      overlooked_crisis_index,
      pooled_funding_usd
    FROM latest_country
    WHERE rn = 1
      AND iso3 IS NOT NULL
  `;

  const variants = [
    {
      countryExpr: "country_plan_name",
      peopleInNeedColumn: "people_in_need",
      fundingColumn: "funding_received_usd",
      requirementsColumn: "funding_required_usd",
      pooledFundingColumn: "pooled_funding_usd"
    },
    {
      countryExpr: "country_name",
      peopleInNeedColumn: "people_in_need",
      fundingColumn: "funding_received_usd",
      requirementsColumn: "funding_required_usd",
      pooledFundingColumn: "pooled_funding_usd"
    },
    {
      countryExpr: "country_plan_name",
      peopleInNeedColumn: "total_people_in_need",
      fundingColumn: "total_funding_usd",
      requirementsColumn: "total_requirements_usd",
      pooledFundingColumn: "pooled_funding_usd"
    },
    {
      countryExpr: "country_name",
      peopleInNeedColumn: "total_people_in_need",
      fundingColumn: "total_funding_usd",
      requirementsColumn: "total_requirements_usd",
      pooledFundingColumn: "pooled_funding_usd"
    },
    {
      countryExpr: "CAST(iso3 AS STRING)",
      peopleInNeedColumn: "people_in_need",
      fundingColumn: "funding_received_usd",
      requirementsColumn: "funding_required_usd",
      pooledFundingColumn: "pooled_funding_usd"
    },
    {
      countryExpr: "CAST(iso3 AS STRING)",
      peopleInNeedColumn: "total_people_in_need",
      fundingColumn: "total_funding_usd",
      requirementsColumn: "total_requirements_usd",
      pooledFundingColumn: "pooled_funding_usd"
    }
  ] as const;

  let rows: Array<Record<string, unknown>> | null = null;
  let lastError: unknown = null;
  for (const variant of variants) {
    try {
      rows = await runSqlStatement(buildQuery(variant));
      break;
    } catch (error) {
      lastError = error;
      if (!isUnresolvedColumnError(error)) throw error;
    }
  }

  if (!rows) {
    throw (lastError ?? new Error("Unable to fetch latest country rows for all schema variants."));
  }

  return rows
    .map((row) => {
      const iso3 = String(row.iso3 ?? "")
        .trim()
        .toUpperCase();
      if (!/^[A-Z]{3}$/.test(iso3)) return null;
      return {
        iso3,
        country: String(row.country ?? iso3),
        year: Math.round(toNum(row.year)),
        people_in_need: toNum(row.people_in_need),
        funding_gap_usd: toNum(row.funding_gap_usd),
        funding_gap_per_person_usd: toNum(row.funding_gap_per_person_usd),
        funding_coverage_pct: toNum(row.funding_coverage_pct),
        severity_score: toNum(row.severity_score),
        overlooked_crisis_index: toNum(row.overlooked_crisis_index),
        pooled_funding_usd: toNum(row.pooled_funding_usd)
      } satisfies LatestCountryRow;
    })
    .filter((row): row is LatestCountryRow => Boolean(row));
}
