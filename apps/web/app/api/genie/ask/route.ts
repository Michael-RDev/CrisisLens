import { NextResponse } from "next/server";
import {
  GenieClientError,
  createMessage,
  fetchQueryResult,
  listConversationMessages,
  pollMessage,
  startConversation
} from "@/lib/genieClient";

type AskIntent = "summary" | "overfunded" | "top10" | "comparison" | "general";

type AskPayload = {
  conversationId?: string;
  iso3?: string;
  countryName?: string;
  intent?: AskIntent;
  question?: string;
};

function buildDeterministicPrompt(input: {
  iso3: string;
  countryName?: string;
  intent: AskIntent;
  question?: string;
}) {
  const countryLabel = input.countryName?.trim() ? `${input.countryName.trim()} (${input.iso3})` : input.iso3;
  const intentGuidance: Record<AskIntent, string> = {
    summary:
      "Provide a concise country geo-insight summary with current humanitarian funding context.",
    overfunded:
      "Identify whether this country appears relatively overfunded versus need indicators. If evidence is insufficient, explicitly say so.",
    top10:
      "Include a ranked top-10 table relevant to this country context and explain ranking criteria.",
    comparison:
      "Compare this country against peers with similar profile and include a compact ranked table.",
    general:
      "Answer the question directly and include a small supporting table when useful."
  };

  return [
    `Use the curated Genie space data (crisislens_master) and latest available year for ISO3=${input.iso3}.`,
    `Country focus: ${countryLabel}.`,
    intentGuidance[input.intent],
    "Return a rich country brief: 6-10 concise factual sentences, then exactly 3 bullet points.",
    "Cover humanitarian context, funding adequacy, risk signals, and why this matters operationally.",
    "Include these metrics when available: overlooked_crisis_index, severity_score, funding_gap_score, total_people_in_need, crisis_status, funding_coverage_pct, funding_gap_per_person_usd.",
    "If a metric is unavailable, say so explicitly instead of guessing.",
    input.question?.trim() ? `User question: ${input.question.trim()}` : "User question: country summary."
  ].join(" ");
}

function extractSqlAndAttachmentId(attachments: Array<Record<string, unknown>>) {
  for (const attachment of attachments) {
    const query = attachment.query as { query?: unknown } | undefined;
    const attachmentId = attachment.attachment_id;
    if (typeof query?.query === "string" && query.query.trim() && typeof attachmentId === "string") {
      return { sql: query.query.trim(), attachmentId };
    }
  }
  return { sql: null as string | null, attachmentId: null as string | null };
}

function extractAttachmentText(attachments: Array<Record<string, unknown>>): string | null {
  for (const attachment of attachments) {
    const text = attachment.text;
    if (typeof text === "string" && text.trim()) return text.trim();
    if (Array.isArray(text)) {
      const joined = text.map((item) => String(item)).join(" ").trim();
      if (joined) return joined;
    }
    if (text && typeof text === "object") {
      const candidate = (text as { value?: unknown; content?: unknown }).value;
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
      const content = (text as { value?: unknown; content?: unknown }).content;
      if (typeof content === "string" && content.trim()) return content.trim();
    }
  }
  return null;
}

function findIndex(columns: string[], ...aliases: string[]): number {
  const normalized = columns.map((column) => column.toLowerCase());
  for (const alias of aliases) {
    const idx = normalized.findIndex((column) => column === alias.toLowerCase());
    if (idx !== -1) return idx;
  }
  for (const alias of aliases) {
    const idx = normalized.findIndex((column) => column.includes(alias.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function synthesizeCountrySummary(
  queryResult: { columns: string[]; rows: unknown[][]; rowCount?: number } | null,
  countryName: string | undefined,
  iso3: string
): string {
  if (!queryResult || !queryResult.columns.length || !queryResult.rows.length) return "";
  const columns = queryResult.columns;
  const first = queryResult.rows[0];
  if (!Array.isArray(first)) return "";

  const idxCountry = findIndex(columns, "country_plan_name", "country");
  const idxYear = findIndex(columns, "year");
  const idxCoverage = findIndex(columns, "funding_coverage_pct", "coverage_pct");
  const idxPin = findIndex(columns, "total_people_in_need", "people_in_need");
  const idxGap = findIndex(columns, "funding_gap_usd", "gap_usd");
  const idxGapPer = findIndex(columns, "funding_gap_per_person_usd", "funding_gap_per_person");
  const idxStatus = findIndex(columns, "crisis_status");
  const idxSeverity = findIndex(columns, "severity_score");
  const idxOci = findIndex(columns, "overlooked_crisis_index");

  const label = (idxCountry >= 0 ? String(first[idxCountry] ?? "") : "").trim() || countryName || iso3;
  const year = idxYear >= 0 ? Math.round(toNum(first[idxYear])) : 0;
  const coverage = idxCoverage >= 0 ? toNum(first[idxCoverage]) : 0;
  const pin = idxPin >= 0 ? toNum(first[idxPin]) : 0;
  const gapUsd = idxGap >= 0 ? toNum(first[idxGap]) : 0;
  const gapPer = idxGapPer >= 0 ? toNum(first[idxGapPer]) : 0;
  const status = idxStatus >= 0 ? String(first[idxStatus] ?? "").trim() : "";
  const severity = idxSeverity >= 0 ? toNum(first[idxSeverity]) : 0;
  const oci = idxOci >= 0 ? toNum(first[idxOci]) : 0;

  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  });

  const lines = [
    `${label} (${iso3}) ${year ? `in ${year}` : ""} remains in focus for humanitarian funding decisions.`,
    pin > 0 ? `People in need are approximately ${compact.format(pin)}, indicating material humanitarian pressure.` : "People-in-need values were not returned in this run.",
    coverage > 0
      ? `Funding coverage is ${coverage.toFixed(1)}%, which informs whether response plans are adequately resourced.`
      : "Coverage percentage was not returned in this run.",
    gapUsd > 0 ? `The absolute funding gap is about ${money.format(gapUsd)}.` : "No positive funding gap value was returned.",
    gapPer > 0 ? `Gap per person is ${money.format(gapPer)}, a signal of per-capita underfunding intensity.` : "",
    status ? `Current crisis status is reported as: ${status}.` : "",
    severity > 0 ? `Severity score is ${severity.toFixed(2)}.` : "",
    oci > 0 ? `Overlooked Crisis Index is ${oci.toFixed(2)}.` : "",
    typeof queryResult.rowCount === "number"
      ? `This summary is derived from ${queryResult.rowCount} Genie query-result row(s).`
      : "This summary is derived from Genie query-result rows."
  ].filter(Boolean);

  return lines.join(" ");
}

function mapGenieError(error: unknown) {
  if (error instanceof GenieClientError) {
    const status =
      error.code === "BAD_REQUEST"
        ? 400
        : error.code === "AUTH"
          ? 401
          : error.code === "GENIE_TIMEOUT"
            ? 504
            : 502;
    return {
      status,
      body: {
        ok: false,
        code: error.code,
        message:
          error.code === "GENIE_TIMEOUT"
            ? "Genie timed out while generating a response. Please retry."
            : error.message
      }
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      code: "GENIE_FAILED",
      message: error instanceof Error ? error.message : "Unexpected Genie error."
    }
  };
}

export async function POST(request: Request) {
  let payload: AskPayload;
  try {
    payload = (await request.json()) as AskPayload;
  } catch {
    return NextResponse.json(
      { ok: false, code: "BAD_REQUEST", message: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const conversationId = payload.conversationId?.trim();
  const iso3 = payload.iso3?.trim().toUpperCase();
  const intent = payload.intent ?? "summary";
  if (!conversationId || !iso3 || !/^[A-Z]{3}$/.test(iso3)) {
    return NextResponse.json(
      {
        ok: false,
        code: "BAD_REQUEST",
        message: "conversationId and iso3 (ISO3) are required."
      },
      { status: 400 }
    );
  }

  const prompt = buildDeterministicPrompt({
    iso3,
    countryName: payload.countryName,
    intent,
    question: payload.question
  });

  const startedAt = Date.now();
  try {
    let activeConversationId = conversationId;
    let created;
    try {
      created = await createMessage(activeConversationId, prompt);
    } catch (error) {
      // Recover once from stale/invalid conversation by creating a fresh thread.
      if (error instanceof GenieClientError && (error.status === 400 || error.status === 404)) {
        const restarted = await startConversation();
        activeConversationId = restarted.conversationId;
        created = await createMessage(activeConversationId, prompt);
      } else {
        throw error;
      }
    }

    const finalMessage = await pollMessage(activeConversationId, created.messageId);
    const attachments = finalMessage.attachments as Array<Record<string, unknown>>;
    const { sql, attachmentId } = extractSqlAndAttachmentId(attachments);

    let queryResult:
      | {
          columns: string[];
          rows: unknown[][];
          rowCount?: number;
        }
      | null = null;

    if (attachmentId) {
      queryResult = await fetchQueryResult(activeConversationId, finalMessage.id, attachmentId);
    }

    if (finalMessage.status !== "COMPLETED") {
      return NextResponse.json(
        {
          ok: false,
          code: "GENIE_FAILED",
          message: `Genie message status was ${finalMessage.status}.`
        },
        { status: 502 }
      );
    }

    console.info("[genie-ask]", {
      conversationId: activeConversationId,
      messageId: finalMessage.id,
      status: finalMessage.status,
      elapsedMs: Date.now() - startedAt,
      hasQueryResult: Boolean(queryResult)
    });

    let rawSummary = (finalMessage.content ?? "").trim();
    let attachmentText = extractAttachmentText(attachments);
    if (!attachmentText && (rawSummary === prompt.trim() || rawSummary.startsWith("Use the curated Genie space data"))) {
      const messages = await listConversationMessages(activeConversationId);
      const latestCompleted = messages
        .filter((message) => message.status === "COMPLETED")
        .sort((a, b) => Number(b.created_timestamp ?? 0) - Number(a.created_timestamp ?? 0))[0];
      if (latestCompleted) {
        rawSummary = String(latestCompleted.content ?? "").trim();
        attachmentText = extractAttachmentText((latestCompleted.attachments ?? []) as Array<Record<string, unknown>>);
      }
    }
    const candidateSummary =
      attachmentText && attachmentText.trim()
        ? attachmentText.trim()
        : rawSummary && rawSummary !== prompt.trim()
          ? rawSummary
          : "";
    const summaryText = candidateSummary
      ? candidateSummary
      : synthesizeCountrySummary(queryResult, payload.countryName, iso3) ||
        (queryResult
          ? "Genie returned a structured query result table for this request."
          : "Genie completed the request but returned no readable narrative text.");

    return NextResponse.json({
      ok: true,
      conversationId: activeConversationId,
      messageId: finalMessage.id,
      summaryText,
      sql,
      queryResult
    });
  } catch (error) {
    const mapped = mapGenieError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
