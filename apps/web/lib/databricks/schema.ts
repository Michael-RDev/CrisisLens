import { runSqlStatement } from "@/lib/databricks";

const SCHEMA_TTL_MS = 5 * 60 * 1000;

let schemaCache: {
  table: string;
  expiresAt: number;
  columns: Set<string>;
} | null = null;

export function getCrisisTableName(): string {
  return process.env.CRISIS_TABLE_FQN?.trim() || "workspace.new.crisislens_master";
}

function normalizeColumn(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.startsWith("#")) return null;
  if (/^[\-]+$/.test(text)) return null;
  return text.toLowerCase();
}

export async function getCrisisTableColumns(force = false): Promise<Set<string>> {
  const table = getCrisisTableName();
  if (!force && schemaCache && schemaCache.table === table && Date.now() < schemaCache.expiresAt) {
    return schemaCache.columns;
  }

  const rows = await runSqlStatement(`DESCRIBE TABLE ${table}`);
  const columns = new Set<string>();

  rows.forEach((row) => {
    const fromColName = normalizeColumn(row.col_name);
    const fromColumnName = normalizeColumn(row.column_name);
    const column = fromColName ?? fromColumnName;
    if (column) columns.add(column);
  });

  if (!columns.size) {
    throw new Error(`Could not load schema columns for ${table}.`);
  }

  schemaCache = {
    table,
    columns,
    expiresAt: Date.now() + SCHEMA_TTL_MS
  };

  return columns;
}

export function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (columns.has(normalized)) return candidate;
  }
  return null;
}
