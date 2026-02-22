import { runSqlStatement } from "@/lib/databricks";
import { riskBandFromScore } from "@/lib/metrics";
import { CountryMetrics, RiskBand } from "@/lib/types";

export type DatabricksCountryState = {
  iso3: string;
  narrative?: string;
  riskBand?: RiskBand;
  agentTimestamp?: string;
  riskDrivers?: string[];
  recommendedActions?: string[];
  confidence?: number;
};

export interface DatabricksProvider {
  fetchCountryState(iso3: string): Promise<DatabricksCountryState | null>;
  fetchGlobalOverrides(): Promise<Record<string, Partial<CountryMetrics>>>;
}

type CountryStateRow = {
  country: string;
  iso3: string;
  year: number;
  people_in_need: number;
  people_targeted: number;
  funding_usd: number;
  requirements_usd: number;
  funding_gap_usd: number;
  funding_gap_per_person: number;
  coverage_pct: number;
};

function toNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCurrencyCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function toPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getTableFqn(): string {
  return process.env.CRISIS_TABLE_FQN?.trim() || "workspace.new.crisislens_master";
}

function isUnresolvedCountryColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("unresolved_column");
}

function mapRow(row: Record<string, unknown>): CountryStateRow {
  const coverageRatio = toNum(row.funding_coverage_ratio);
  const peopleInNeed = toNum(row.people_in_need ?? row.total_people_in_need);
  const gapUsd = toNum(row.funding_gap_usd);
  const gapPerPersonRaw = toNum(row.funding_gap_per_person ?? row.funding_gap_per_person_usd);
  const gapPerPerson = gapPerPersonRaw || (peopleInNeed > 0 ? gapUsd / peopleInNeed : 0);

  return {
    country: String(row.country ?? row.country_plan_name ?? "Unknown"),
    iso3: String(row.iso3 ?? "").toUpperCase(),
    year: Math.round(toNum(row.year)),
    people_in_need: peopleInNeed,
    people_targeted: toNum(row.people_targeted ?? row.total_people_targeted),
    funding_usd: toNum(row.funding_usd ?? row.total_funding_usd),
    requirements_usd: toNum(row.requirements_usd ?? row.total_requirements_usd),
    funding_gap_usd: gapUsd,
    funding_gap_per_person: gapPerPerson,
    coverage_pct: Number(((coverageRatio || 0) * 100).toFixed(1))
  };
}

function computeRiskScore(row: CountryStateRow): number {
  let score = 0;
  if (row.coverage_pct < 10) score += 45;
  else if (row.coverage_pct < 20) score += 32;
  else if (row.coverage_pct < 35) score += 20;
  else score += 8;

  if (row.funding_gap_per_person > 80) score += 28;
  else if (row.funding_gap_per_person > 45) score += 20;
  else if (row.funding_gap_per_person > 20) score += 12;
  else score += 4;

  if (row.people_in_need > 30_000_000) score += 24;
  else if (row.people_in_need > 15_000_000) score += 17;
  else if (row.people_in_need > 5_000_000) score += 10;
  else score += 4;

  return Math.min(100, Math.max(0, score));
}

function buildRiskDrivers(row: CountryStateRow): string[] {
  const drivers: string[] = [];
  if (row.coverage_pct < 20) drivers.push(`Coverage remains low at ${toPct(row.coverage_pct)}.`);
  if (row.funding_gap_per_person > 45) {
    drivers.push(`Funding gap per person is elevated at ${toCurrencyCompact(row.funding_gap_per_person)}.`);
  }
  if (row.people_in_need > 10_000_000) {
    drivers.push(`${new Intl.NumberFormat("en-US").format(Math.round(row.people_in_need))} people are in need.`);
  }
  if (!drivers.length) drivers.push("Funding pressure remains present across humanitarian sectors.");
  return drivers.slice(0, 3);
}

function buildActions(row: CountryStateRow): string[] {
  const actions: string[] = [];
  if (row.coverage_pct < 20) actions.push("Prioritize fast-release funding to highest-need sectors.");
  if (row.funding_gap_per_person > 40) actions.push("Target interventions where gap-per-person is most severe.");
  if (row.people_targeted < row.people_in_need * 0.7) {
    actions.push("Expand targeting coverage to reduce unmet needs.");
  }
  if (!actions.length) actions.push("Maintain current funding posture and monitor for sudden trend shifts.");
  return actions.slice(0, 3);
}

class SqlDatabricksProvider implements DatabricksProvider {
  async fetchCountryState(iso3: string): Promise<DatabricksCountryState | null> {
    const host = process.env.DATABRICKS_HOST?.trim();
    const token = process.env.DATABRICKS_TOKEN?.trim();
    const warehouse = process.env.DATABRICKS_WAREHOUSE_ID?.trim();
    if (!host || !token || !warehouse) return null;

    const table = getTableFqn();
    const buildStatement = (variant: {
      countryExpr: string;
      peopleInNeedColumn: string;
      peopleTargetedColumn: string;
      fundingColumn: string;
      requirementsColumn: string;
      gapPerPersonColumn: string;
      coverageRatioExpr: string;
    }) => `
      SELECT
             ${variant.countryExpr} AS country,
             iso3,
             year,
             COALESCE(${variant.peopleInNeedColumn}, 0) AS people_in_need,
             COALESCE(${variant.peopleTargetedColumn}, 0) AS people_targeted,
             COALESCE(${variant.fundingColumn}, 0) AS funding_usd,
             COALESCE(${variant.requirementsColumn}, 0) AS requirements_usd,
             COALESCE(funding_gap_usd, GREATEST(COALESCE(${variant.requirementsColumn}, 0) - COALESCE(${variant.fundingColumn}, 0), 0)) AS funding_gap_usd,
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
               ${variant.coverageRatioExpr},
               CASE
                 WHEN COALESCE(${variant.requirementsColumn}, 0) = 0 THEN 0
                 ELSE COALESCE(${variant.fundingColumn}, 0) / COALESCE(${variant.requirementsColumn}, 0)
               END
             ) AS funding_coverage_ratio
      FROM ${table}
      WHERE iso3 = :iso3
      ORDER BY year DESC
      LIMIT 1
    `;

    try {
      const variants = [
        {
          countryExpr: "country_plan_name",
          peopleInNeedColumn: "people_in_need",
          peopleTargetedColumn: "people_targeted",
          fundingColumn: "funding_received_usd",
          requirementsColumn: "funding_required_usd",
          gapPerPersonColumn: "funding_gap_per_person_usd",
          coverageRatioExpr: "funding_coverage_pct / 100.0"
        },
        {
          countryExpr: "country_name",
          peopleInNeedColumn: "people_in_need",
          peopleTargetedColumn: "people_targeted",
          fundingColumn: "funding_received_usd",
          requirementsColumn: "funding_required_usd",
          gapPerPersonColumn: "funding_gap_per_person_usd",
          coverageRatioExpr: "funding_coverage_pct / 100.0"
        },
        {
          countryExpr: "country_plan_name",
          peopleInNeedColumn: "total_people_in_need",
          peopleTargetedColumn: "total_people_targeted",
          fundingColumn: "total_funding_usd",
          requirementsColumn: "total_requirements_usd",
          gapPerPersonColumn: "funding_gap_per_person_usd",
          coverageRatioExpr: "funding_coverage_pct / 100.0"
        },
        {
          countryExpr: "country_name",
          peopleInNeedColumn: "total_people_in_need",
          peopleTargetedColumn: "total_people_targeted",
          fundingColumn: "total_funding_usd",
          requirementsColumn: "total_requirements_usd",
          gapPerPersonColumn: "funding_gap_per_person_usd",
          coverageRatioExpr: "funding_coverage_pct / 100.0"
        },
        {
          countryExpr: "CAST(iso3 AS STRING)",
          peopleInNeedColumn: "people_in_need",
          peopleTargetedColumn: "people_targeted",
          fundingColumn: "funding_received_usd",
          requirementsColumn: "funding_required_usd",
          gapPerPersonColumn: "funding_gap_per_person_usd",
          coverageRatioExpr: "funding_coverage_pct / 100.0"
        },
        {
          countryExpr: "CAST(iso3 AS STRING)",
          peopleInNeedColumn: "total_people_in_need",
          peopleTargetedColumn: "total_people_targeted",
          fundingColumn: "total_funding_usd",
          requirementsColumn: "total_requirements_usd",
          gapPerPersonColumn: "funding_gap_per_person_usd",
          coverageRatioExpr: "funding_coverage_pct / 100.0"
        }
      ] as const;

      let lastError: unknown = null;
      let resolvedRows: Array<Record<string, unknown>> | null = null;
      for (const variant of variants) {
        try {
          resolvedRows = await runSqlStatement(buildStatement(variant), { iso3 });
          break;
        } catch (error) {
          lastError = error;
          if (!isUnresolvedCountryColumnError(error)) throw error;
        }
      }

      if (!resolvedRows) {
        throw (lastError ?? new Error("Unable to fetch country state for all schema variants."));
      }
      const rows = resolvedRows;
      if (!rows.length) return null;
      const row = mapRow(rows[0]);
      const score = computeRiskScore(row);

      return {
        iso3: row.iso3,
        narrative: `${row.country} (${row.iso3}) ${row.year} shows ${toPct(
          row.coverage_pct
        )} coverage with a ${toCurrencyCompact(row.funding_gap_usd)} funding gap.`,
        riskBand: riskBandFromScore(score),
        agentTimestamp: new Date().toISOString(),
        confidence: Number(Math.min(0.95, 0.6 + score / 250).toFixed(2)),
        riskDrivers: buildRiskDrivers(row),
        recommendedActions: buildActions(row)
      };
    } catch (error) {
      console.error("Failed to load Databricks country state", {
        iso3,
        message: error instanceof Error ? error.message : "Unknown error"
      });
      return null;
    }
  }

  async fetchGlobalOverrides(): Promise<Record<string, Partial<CountryMetrics>>> {
    return {};
  }
}

const provider = new SqlDatabricksProvider();

export function getDatabricksProvider(): DatabricksProvider {
  return provider;
}
