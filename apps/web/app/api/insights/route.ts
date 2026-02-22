import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { GenieAskResponse } from "@/lib/api/crisiswatch";
import { startConversation } from "@/lib/genieClient";
import { stripMarkdownNoise } from "@/lib/genie/response-format";
import { getConversationForSession, setConversationForSession } from "@/lib/genie/session-store";

const SESSION_COOKIE = "crisis_session";
const COUNTRY_CONVERSATION_COOKIE = "crisis_conversation_country";
const GENERAL_CONVERSATION_COOKIE = "crisis_conversation_general";
const INSIGHT_CACHE_TTL_MS = 45_000;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 6;

type InsightData = {
  headline: string;
  summary: string;
  keyPoints: string[];
  actions: string[];
  followups: string[];
  metricHighlights: Array<{ label: string; value: string }>;
  queryTable: {
    columns: string[];
    rows: Array<Record<string, string | number | null>>;
    rowCount?: number;
    chart?: {
      label: string;
      valueLabel: string;
      points: Array<{ label: string; value: number }>;
    } | null;
  } | null;
  queryUsed: string;
  sourceSql: string | null;
  queriedByGenie: true;
};

type CacheEntry = {
  data: InsightData;
  expiresAt: number;
};

const insightCache = new Map<string, CacheEntry>();
const inflightByKey = new Map<string, Promise<InsightData>>();

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Payload = {
  scope?: "country" | "general";
  iso3?: string;
  question?: string;
  countryName?: string;
  year?: number;
};

function defaultQuestion(iso3: string, countryName?: string, year?: number): string {
  const label = countryName?.trim() ? `${countryName.trim()} (${iso3})` : iso3;
  return `Provide a country summary for ${label}${year ? ` in ${year}` : ""}. State clearly when metrics are unavailable and avoid assumptions.`;
}

function normalizeList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function normalizeNarrative(value: string): string {
  return stripMarkdownNoise(value).trim();
}

function normalizeHeadline(headline: string, summary: string, fallback: string): string {
  const cleanHeadline = normalizeNarrative(headline);
  if (!cleanHeadline) return fallback;
  const cleanSummary = normalizeNarrative(summary).toLowerCase();
  if (!cleanSummary) return cleanHeadline;
  return cleanSummary.startsWith(cleanHeadline.toLowerCase()) ? fallback : cleanHeadline;
}

function toTitleCaseColumn(column: string): string {
  const normalized = column.replace(/_/g, " ").trim().toLowerCase();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCell(column: string, value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  const numeric = numberOrNull(value);
  const key = column.toLowerCase();
  if (numeric !== null) {
    if (key.includes("pct") || key.includes("coverage")) return Number(numeric.toFixed(1));
    if (key.includes("usd") || key.includes("gap")) return Number(numeric.toFixed(2));
    if (key.includes("people") || key.includes("need")) return Math.round(numeric);
    return Number(numeric.toFixed(2));
  }
  return String(value);
}

function findColumnIndex(columns: string[], ...aliases: string[]): number {
  const lowered = columns.map((column) => column.toLowerCase());
  for (const alias of aliases) {
    const exact = lowered.findIndex((column) => column === alias.toLowerCase());
    if (exact !== -1) return exact;
  }
  for (const alias of aliases) {
    const partial = lowered.findIndex((column) => column.includes(alias.toLowerCase()));
    if (partial !== -1) return partial;
  }
  return -1;
}

function buildQueryTable(queryResult: {
  columns: string[];
  rows: unknown[][];
  rowCount?: number;
} | null): InsightData["queryTable"] {
  if (!queryResult?.columns?.length || !queryResult.rows?.length) return null;
  const columns = queryResult.columns;
  const preferredIndices = [
    findColumnIndex(columns, "country_plan_name", "country"),
    findColumnIndex(columns, "iso3"),
    findColumnIndex(columns, "year"),
    findColumnIndex(columns, "funding_coverage_pct", "coverage_pct"),
    findColumnIndex(columns, "funding_gap_per_person_usd", "funding_gap_per_person"),
    findColumnIndex(columns, "funding_gap_usd", "gap_usd"),
    findColumnIndex(columns, "total_people_in_need", "people_in_need"),
    findColumnIndex(columns, "crisis_status")
  ].filter((index, position, array) => index >= 0 && array.indexOf(index) === position);

  const selectedIndices = preferredIndices.length
    ? preferredIndices
    : columns.map((_, index) => index).slice(0, 6);

  const selectedColumns = selectedIndices.map((index) => columns[index]);
  const labels = selectedColumns.map((column) => toTitleCaseColumn(column));

  const rows = queryResult.rows
    .filter((row): row is unknown[] => Array.isArray(row))
    .slice(0, 10)
    .map((row) =>
      selectedColumns.reduce<Record<string, string | number | null>>((acc, column, columnIndex) => {
        const sourceIndex = selectedIndices[columnIndex];
        acc[labels[columnIndex]] = formatCell(column, row[sourceIndex]);
        return acc;
      }, {})
    );

  const labelColumn =
    labels.find((label) => label.toLowerCase().includes("country")) ??
    labels.find((label) => label.toLowerCase().includes("iso3")) ??
    labels[0];
  const valueColumn =
    labels.find((label) => label.toLowerCase().includes("coverage")) ??
    labels.find((label) => label.toLowerCase().includes("gap")) ??
    labels.find((label) => label.toLowerCase().includes("need")) ??
    null;

  const chart =
    labelColumn && valueColumn
      ? {
          label: labelColumn,
          valueLabel: valueColumn,
          points: rows
            .map((row) => {
              const label = row[labelColumn];
              const value = numberOrNull(row[valueColumn]);
              if (typeof label !== "string" || value === null || value <= 0) return null;
              return { label, value };
            })
            .filter((point): point is { label: string; value: number } => point !== null)
            .slice(0, 8)
        }
      : null;

  return {
    columns: labels,
    rows,
    rowCount: typeof queryResult.rowCount === "number" ? queryResult.rowCount : rows.length,
    chart: chart && chart.points.length > 1 ? chart : null
  };
}

function conversationCookieForScope(scope: "country" | "general"): string {
  return scope === "country" ? COUNTRY_CONVERSATION_COOKIE : GENERAL_CONVERSATION_COOKIE;
}

function scopedSessionKey(sessionId: string, scope: "country" | "general"): string {
  return `${sessionId}:${scope}`;
}

export async function POST(request: NextRequest) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const requestedScope = payload.scope === "general" ? "general" : payload.scope === "country" ? "country" : null;
  const iso3 = payload.iso3?.trim().toUpperCase() ?? "";
  const scope: "country" | "general" = requestedScope ?? (iso3 ? "country" : "general");
  if (scope === "country" && !/^[A-Z]{3}$/.test(iso3)) {
    return NextResponse.json({ ok: false, error: "iso3 is required (ISO3) for country insights." }, { status: 400 });
  }
  if (scope === "general" && !payload.question?.trim()) {
    return NextResponse.json({ ok: false, error: "question is required for general insights." }, { status: 400 });
  }

  const question = scope === "country"
    ? payload.question?.trim() || defaultQuestion(iso3, payload.countryName, payload.year)
    : payload.question?.trim() || "Provide a concise cross-country funding insight.";
  const conversationCookie = conversationCookieForScope(scope);
  const sessionKey = scopedSessionKey;
  const cacheKey = `${scope}::${scope === "country" ? iso3 : "global"}::${question}`;
  const now = Date.now();
  const cached = insightCache.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.data.summary.trim()) {
    const existingSessionId = request.cookies.get(SESSION_COOKIE)?.value;
    const sessionId = existingSessionId ?? randomUUID();
    const existingConversationId = request.cookies.get(conversationCookie)?.value?.trim();
    const mappedConversationId = getConversationForSession(sessionKey(sessionId, scope));
    const activeConversationId = existingConversationId || mappedConversationId;
    const response = NextResponse.json({ ok: true, data: cached.data });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS
    });
    if (activeConversationId) {
      response.cookies.set({
        name: conversationCookie,
        value: activeConversationId,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS
      });
    }
    return response;
  }

  try {
    const existingSessionId = request.cookies.get(SESSION_COOKIE)?.value;
    const sessionId = existingSessionId ?? randomUUID();
    const existingConversationId = request.cookies.get(conversationCookie)?.value?.trim();
    let conversationId = existingConversationId || getConversationForSession(sessionKey(sessionId, scope));
    if (!conversationId) {
      const started = await startConversation();
      conversationId = started.conversationId;
      setConversationForSession(sessionKey(sessionId, scope), conversationId);
    } else {
      setConversationForSession(sessionKey(sessionId, scope), conversationId);
    }

    const runOrAwait = inflightByKey.get(cacheKey) ?? (async () => {
      const askResponse = await fetch(new URL("/api/genie/ask", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          ...(scope === "country"
            ? {
                iso3,
                countryName: payload.countryName,
                intent: "summary"
              }
            : {
                intent: "general"
              }),
          question
        }),
        cache: "no-store"
      });

      const askPayload = (await askResponse.json()) as GenieAskResponse;
      if (!askResponse.ok || !askPayload.ok) {
        const message = askPayload.ok ? "Unable to fetch insights." : askPayload.message;
        throw new HttpError(
          askResponse.status >= 400 && askResponse.status < 600 ? askResponse.status : 502,
          message
        );
      }

      if (askPayload.conversationId !== conversationId) {
        conversationId = askPayload.conversationId;
        setConversationForSession(sessionKey(sessionId, scope), askPayload.conversationId);
      }

      const formatted = askPayload.formatted;
      const summaryText = askPayload.summaryText?.trim() ?? "";
      const formattedSummary = typeof formatted?.summary === "string" ? formatted.summary.trim() : "";
      const formattedHeadline = typeof formatted?.headline === "string" ? formatted.headline.trim() : "";
      const normalizedSummaryText = normalizeNarrative(summaryText);
      const normalizedFormattedSummary = normalizeNarrative(formattedSummary);
      const resolvedSummary =
        normalizedFormattedSummary ||
        normalizedSummaryText ||
        formattedHeadline ||
        (scope === "country"
          ? "Genie returned query results for this country, but no narrative text was attached yet."
          : "Genie returned query results, but no narrative text was attached yet.");
      const hasGenieNarrative = Boolean(normalizedSummaryText || normalizedFormattedSummary || formattedHeadline);
      const queryTable = askPayload.queryResult ? buildQueryTable(askPayload.queryResult) : null;
      const data: InsightData = {
        headline: hasGenieNarrative
          ? normalizeHeadline(
              formattedHeadline,
              resolvedSummary,
              scope === "country" ? "Country Insight" : "General Insight"
            )
          : scope === "country"
            ? "No Genie narrative returned"
            : "No general Genie narrative returned",
        summary: resolvedSummary,
        keyPoints: hasGenieNarrative ? normalizeList(formatted?.keyPoints) : [],
        actions: hasGenieNarrative ? normalizeList(formatted?.actions) : [],
        followups: hasGenieNarrative ? normalizeList(formatted?.followups) : [],
        metricHighlights: Array.isArray(formatted?.metricHighlights) ? formatted.metricHighlights : [],
        queryTable,
        queryUsed: question,
        sourceSql: askPayload.sql ?? null,
        queriedByGenie: true
      };

      insightCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + INSIGHT_CACHE_TTL_MS
      });

      return data;
    })();

    if (!inflightByKey.has(cacheKey)) {
      inflightByKey.set(cacheKey, runOrAwait);
    }

    let data: InsightData;
    try {
      data = await runOrAwait;
    } finally {
      if (inflightByKey.get(cacheKey) === runOrAwait) {
        inflightByKey.delete(cacheKey);
      }
    }

    const response = NextResponse.json({ ok: true, data });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS
    });
    response.cookies.set({
      name: conversationCookie,
      value: conversationId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate insight.";
    const status =
      error instanceof HttpError
        ? error.status
        : 502;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
