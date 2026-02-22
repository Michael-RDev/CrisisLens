export type DatabricksMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DatabricksErrorPayload = {
  error_code?: string;
  message?: string;
  details?: unknown;
};

type SqlStatementResponse = {
  statement_id?: string;
  status?: {
    state?: string;
    error?: DatabricksErrorPayload;
  };
  manifest?: {
    schema?: {
      columns?: Array<{ name?: string; type_text?: string }>;
    };
  };
  result?: {
    data_array?: unknown[][];
  };
  result_data?: {
    data_array?: unknown[][];
  };
};

const SQL_POLL_INTERVAL_MS = 1200;
const SQL_TIMEOUT_MS = 50_000;
const AI_TIMEOUT_MS = 45_000;
const DEFAULT_AI_GATEWAY_PATH = "/api/2.0/ai-gateway/chat/completions";

export class DatabricksApiError extends Error {
  status: number;
  payload?: DatabricksErrorPayload | string;

  constructor(message: string, status: number, payload?: DatabricksErrorPayload | string) {
    super(message);
    this.name = "DatabricksApiError";
    this.status = status;
    this.payload = payload;
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getHost(): string {
  return getRequiredEnv("DATABRICKS_HOST").replace(/\/$/, "");
}

function parseMaybeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function shouldTryNextAiPath(error: unknown): boolean {
  if (!(error instanceof DatabricksApiError)) return false;
  const payloadText =
    typeof error.payload === "string" ? error.payload.toLowerCase() : JSON.stringify(error.payload).toLowerCase();
  return error.status === 404 || payloadText.includes("endpoint_not_found") || payloadText.includes("not found");
}

export async function databricksFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const host = getHost();
  const token = getRequiredEnv("DATABRICKS_TOKEN");
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  const raw = await response.text();
  const parsed = parseMaybeJson(raw);

  if (!response.ok) {
    const requestId =
      typeof parsed === "object" && parsed !== null && "details" in parsed
        ? (parsed as { details?: unknown }).details
        : undefined;
    console.error("Databricks API error", {
      status: response.status,
      path,
      requestId
    });

    throw new DatabricksApiError(
      `Databricks request failed (${response.status})`,
      response.status,
      (parsed as DatabricksErrorPayload) ?? raw
    );
  }

  return parsed;
}

function extractSqlRows(payload: SqlStatementResponse): Array<Record<string, unknown>> {
  const dataArray = payload.result?.data_array ?? payload.result_data?.data_array ?? [];
  const columns = payload.manifest?.schema?.columns ?? [];

  if (!Array.isArray(dataArray) || !Array.isArray(columns)) return [];

  return dataArray.map((row) => {
    const values = Array.isArray(row) ? row : [];
    return columns.reduce<Record<string, unknown>>((acc, column, index) => {
      const key = column.name?.trim() || `col_${index + 1}`;
      acc[key] = values[index];
      return acc;
    }, {});
  });
}

export async function runSqlStatement(
  statement: string,
  params: Record<string, string> = {}
): Promise<Array<Record<string, unknown>>> {
  const warehouseId = getRequiredEnv("DATABRICKS_WAREHOUSE_ID");
  const submitted = (await databricksFetch("/api/2.0/sql/statements", {
    method: "POST",
    body: JSON.stringify({
      statement,
      warehouse_id: warehouseId,
      wait_timeout: "0s",
      parameters: Object.entries(params).map(([name, value]) => ({
        name,
        value,
        type: "STRING"
      }))
    })
  })) as SqlStatementResponse;

  const statementId = submitted.statement_id;
  if (!statementId) {
    throw new Error("Databricks SQL statement did not return statement_id.");
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < SQL_TIMEOUT_MS) {
    const polled = (await databricksFetch(`/api/2.0/sql/statements/${statementId}`)) as SqlStatementResponse;
    const state = polled.status?.state;

    if (state === "SUCCEEDED") {
      return extractSqlRows(polled);
    }

    if (state === "FAILED" || state === "CANCELED" || state === "CLOSED") {
      throw new DatabricksApiError(
        `Databricks SQL statement ${state.toLowerCase()}.`,
        502,
        polled.status?.error ?? "No SQL error details."
      );
    }

    await new Promise((resolve) => setTimeout(resolve, SQL_POLL_INTERVAL_MS));
  }

  throw new Error("Timed out waiting for Databricks SQL statement to complete.");
}

function extractAiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const maybeChoices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(maybeChoices) || maybeChoices.length === 0) return "";

  const first = maybeChoices[0] as {
    message?: { content?: unknown };
    delta?: { content?: unknown };
    text?: unknown;
  };

  const content = first.message?.content ?? first.delta?.content ?? first.text;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join(" ")
      .trim();
  }

  const maybePredictions = (payload as { predictions?: unknown }).predictions;
  if (Array.isArray(maybePredictions) && maybePredictions.length > 0) {
    const first = maybePredictions[0] as
      | string
      | { content?: unknown; text?: unknown; output_text?: unknown; response?: unknown };
    if (typeof first === "string") return first;
    const candidate = first.content ?? first.text ?? first.output_text ?? first.response;
    if (typeof candidate === "string") return candidate;
  }

  return "";
}

export async function callAiGateway(messages: DatabricksMessage[], maxTokens = 550): Promise<string> {
  const model = process.env.AI_MODEL?.trim() || "databricks-llama-4-maverick";
  const endpointName = process.env.DATABRICKS_AI_ENDPOINT?.trim() || model;
  const aiChatPath = process.env.DATABRICKS_AI_CHAT_PATH?.trim() || DEFAULT_AI_GATEWAY_PATH;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const attempts: Array<{ label: string; path: string; body: Record<string, unknown> }> = [
      {
        label: "ai-gateway",
        path: aiChatPath,
        body: {
          model,
          messages,
          temperature: 0.2,
          max_tokens: maxTokens
        }
      },
      {
        label: "serving-endpoints",
        path: `/serving-endpoints/${encodeURIComponent(endpointName)}/invocations`,
        body: {
          messages,
          temperature: 0.2,
          max_tokens: maxTokens
        }
      },
      {
        label: "serving-endpoints-api2",
        path: `/api/2.0/serving-endpoints/${encodeURIComponent(endpointName)}/invocations`,
        body: {
          messages,
          temperature: 0.2,
          max_tokens: maxTokens
        }
      }
    ];

    let payload: unknown = null;
    let lastError: unknown = null;

    for (const attempt of attempts) {
      try {
        payload = await databricksFetch(attempt.path, {
          method: "POST",
          body: JSON.stringify(attempt.body),
          signal: controller.signal
        });
        console.info("AI chat endpoint selected", { route: attempt.label, path: attempt.path });
        break;
      } catch (error) {
        lastError = error;
        if (shouldTryNextAiPath(error)) {
          continue;
        }
        throw error;
      }
    }

    if (!payload) {
      throw (
        lastError ??
        new Error(
          "No compatible Databricks chat endpoint found. Set DATABRICKS_AI_CHAT_PATH or DATABRICKS_AI_ENDPOINT."
        )
      );
    }

    const text = extractAiText(payload);
    if (!text.trim()) {
      throw new Error("Databricks chat endpoint returned no assistant content.");
    }

    return text.trim();
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Timed out waiting for AI Gateway response.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
