type GenieStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";

type GenieAttachment = {
  attachment_id?: string;
  query?: {
    query?: string;
  };
  text?: unknown;
  [key: string]: unknown;
};

type GenieMessage = {
  id: string;
  status: GenieStatus;
  content?: string;
  attachments?: GenieAttachment[];
  error?: unknown;
  [key: string]: unknown;
};

export type GenieMessageFinal = {
  id: string;
  status: "COMPLETED" | "FAILED" | "CANCELLED";
  content: string | null;
  attachments: GenieAttachment[];
};

export type QueryResult = {
  columns: string[];
  rows: unknown[][];
  rowCount?: number;
};

export class GenieClientError extends Error {
  status: number;
  code: "AUTH" | "BAD_REQUEST" | "GENIE_FAILED" | "GENIE_TIMEOUT" | "UPSTREAM";
  details?: string;
  requestId?: string | null;

  constructor(
    message: string,
    input: {
      status: number;
      code: "AUTH" | "BAD_REQUEST" | "GENIE_FAILED" | "GENIE_TIMEOUT" | "UPSTREAM";
      details?: string;
      requestId?: string | null;
    }
  ) {
    super(message);
    this.name = "GenieClientError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
    this.requestId = input.requestId;
  }
}

const POST_RETRIES = 3;
const POST_RETRY_BASE_MS = 700;
const POLL_TIMEOUT_MS = 60_000;
const POLL_START_MS = 1_000;
const POLL_MAX_MS = 5_000;
const MIN_POST_GAP_MS = 13_000; // Genie preview is ~5 POST QPM/workspace.

let lastPostAtMs = 0;
let postQueue: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getConfig() {
  const host = process.env.DATABRICKS_HOST?.trim();
  const token = process.env.DATABRICKS_TOKEN?.trim();
  const spaceId = process.env.GENIE_SPACE_ID?.trim();

  if (!host || !token || !spaceId) {
    throw new GenieClientError("Missing Genie environment variables.", {
      status: 500,
      code: "UPSTREAM"
    });
  }

  return {
    host: host.replace(/\/$/, ""),
    token,
    spaceId
  };
}

function toClientCode(status: number): "AUTH" | "BAD_REQUEST" | "GENIE_FAILED" | "UPSTREAM" {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 400 || status === 404) return "BAD_REQUEST";
  if (status >= 500) return "GENIE_FAILED";
  return "UPSTREAM";
}

async function genieFetch<T>(
  path: string,
  init: RequestInit,
  label: string,
  attempt = 1
): Promise<{ data: T; requestId: string | null }> {
  const { host, token } = getConfig();
  const startedAt = Date.now();
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  const requestId = response.headers.get("x-databricks-request-id");
  const raw = await response.text();
  const elapsedMs = Date.now() - startedAt;
  console.info("[genie]", { label, status: response.status, elapsedMs, attempt, requestId });

  if (!response.ok) {
    throw new GenieClientError(`Genie ${label} failed.`, {
      status: response.status,
      code: toClientCode(response.status),
      details: raw || undefined,
      requestId
    });
  }

  if (!raw) return { data: {} as T, requestId };
  try {
    return { data: JSON.parse(raw) as T, requestId };
  } catch {
    return { data: ({ content: raw } as unknown) as T, requestId };
  }
}

async function geniePostWithRetry<T>(path: string, body: unknown, label: string): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= POST_RETRIES; attempt += 1) {
    const runAttempt = async () => {
      const waitMs = Math.max(0, lastPostAtMs + MIN_POST_GAP_MS - Date.now());
      if (waitMs > 0) await sleep(waitMs);
      try {
        const result = await genieFetch<T>(
          path,
          {
            method: "POST",
            body: JSON.stringify(body)
          },
          label,
          attempt
        );
        return result.data;
      } finally {
        lastPostAtMs = Date.now();
      }
    };

    try {
      const resultPromise = postQueue.then(runAttempt);
      postQueue = resultPromise.then(
        () => undefined,
        () => undefined
      );
      return await resultPromise;
    } catch (error) {
      lastError = error;
      const status = error instanceof GenieClientError ? error.status : 0;
      const retryable = status >= 500 || status === 429 || status === 0;
      if (!retryable || attempt === POST_RETRIES) break;
      const delay = status === 429 ? Math.min(30_000, 5_000 * 2 ** (attempt - 1)) : Math.min(6_000, POST_RETRY_BASE_MS * 2 ** (attempt - 1));
      await sleep(delay);
    }
  }

  if (lastError instanceof GenieClientError) {
    if (lastError.status === 429) {
      throw new GenieClientError(
        "Genie is rate-limited right now. Wait about 15-30 seconds and retry.",
        {
          status: 429,
          code: "GENIE_FAILED",
          details: lastError.details,
          requestId: lastError.requestId
        }
      );
    }
    throw lastError;
  }
  throw new GenieClientError("Genie POST request failed.", { status: 502, code: "GENIE_FAILED" });
}

function extractTextFromAttachments(attachments: GenieAttachment[]): string | null {
  for (const attachment of attachments) {
    const text = attachment.text;
    if (typeof text === "string" && text.trim()) return text.trim();
    if (Array.isArray(text)) {
      const joined = text.map((item) => String(item)).join(" ").trim();
      if (joined) return joined;
    }
  }
  return null;
}

export async function startConversation(): Promise<{ conversationId: string }> {
  const { spaceId } = getConfig();
  const payload = await geniePostWithRetry<{ conversation_id: string }>(
    `/api/2.0/genie/spaces/${spaceId}/start-conversation`,
    { content: "CrisisLens session started" },
    "start-conversation"
  );
  return { conversationId: payload.conversation_id };
}

export async function createMessage(
  conversationId: string,
  content: string
): Promise<{ messageId: string }> {
  const { spaceId } = getConfig();
  const payload = await geniePostWithRetry<{ id: string }>(
    `/api/2.0/genie/spaces/${spaceId}/conversations/${conversationId}/messages`,
    { content },
    "create-message"
  );
  return { messageId: payload.id };
}

async function getMessage(conversationId: string, messageId: string): Promise<GenieMessage> {
  const { spaceId } = getConfig();
  const response = await genieFetch<GenieMessage>(
    `/api/2.0/genie/spaces/${spaceId}/conversations/${conversationId}/messages/${messageId}`,
    { method: "GET" },
    "get-message"
  );
  return response.data;
}

export async function pollMessage(
  conversationId: string,
  messageId: string
): Promise<GenieMessageFinal> {
  const startedAt = Date.now();
  let delayMs = POLL_START_MS;

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const message = await getMessage(conversationId, messageId);
    if (message.status === "COMPLETED" || message.status === "FAILED" || message.status === "CANCELLED") {
      return {
        id: message.id,
        status: message.status,
        content: message.content?.trim() || extractTextFromAttachments(message.attachments ?? []),
        attachments: Array.isArray(message.attachments) ? message.attachments : []
      };
    }

    await sleep(delayMs);
    delayMs = Math.min(POLL_MAX_MS, Math.ceil(delayMs * 1.6));
  }

  throw new GenieClientError("Genie polling timeout.", {
    status: 504,
    code: "GENIE_TIMEOUT"
  });
}

export async function listConversationMessages(
  conversationId: string
): Promise<Array<{ id: string; status?: string; content?: string; attachments?: GenieAttachment[]; created_timestamp?: number }>> {
  const { spaceId } = getConfig();
  const response = await genieFetch<{
    messages?: Array<{
      id: string;
      status?: string;
      content?: string;
      attachments?: GenieAttachment[];
      created_timestamp?: number;
    }>;
  }>(
    `/api/2.0/genie/spaces/${spaceId}/conversations/${conversationId}/messages`,
    { method: "GET" },
    "list-messages"
  );
  return Array.isArray(response.data.messages) ? response.data.messages : [];
}

export async function fetchQueryResult(
  conversationId: string,
  messageId: string,
  attachmentId: string
): Promise<QueryResult> {
  const { spaceId } = getConfig();
  const response = await genieFetch<{
    columns?: Array<{ name?: string }>;
    rows?: unknown[][];
    row_count?: number;
    manifest?: { schema?: { columns?: Array<{ name?: string }> } };
    result?: {
      data_array?: unknown[][];
      row_count?: number;
      schema?: { columns?: Array<{ name?: string }> };
    };
    data_array?: unknown[][];
    schema?: { columns?: Array<{ name?: string }> };
  }>(
    `/api/2.0/genie/spaces/${spaceId}/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}/query-result`,
    { method: "GET" },
    "query-result"
  );

  const payload = response.data;
  const columns =
    payload.columns ??
    payload.schema?.columns ??
    payload.result?.schema?.columns ??
    payload.manifest?.schema?.columns ??
    [];
  const columnNames = columns.map((column, idx) => column.name?.trim() || `col_${idx + 1}`);
  const rawRows = payload.rows ?? payload.data_array ?? payload.result?.data_array ?? [];
  let compactRows: unknown[][] = [];
  if (Array.isArray(rawRows) && rawRows.length > 0) {
    if (Array.isArray(rawRows[0])) {
      compactRows = rawRows as unknown[][];
    } else if (rawRows.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
      const objectRows = rawRows as unknown as Array<Record<string, unknown>>;
      const inferredColumns = columnNames.length ? columnNames : Object.keys(objectRows[0]);
      const normalizedColumns = inferredColumns.length ? inferredColumns : ["value"];
      const objectRowsAsArrays = objectRows.map((row) =>
        normalizedColumns.map((column) => row[column] ?? null)
      );
      return {
        columns: normalizedColumns,
        rows: objectRowsAsArrays.slice(0, 5000),
        rowCount: payload.row_count ?? payload.result?.row_count ?? objectRowsAsArrays.length
      };
    }
  }
  const rowCount = payload.row_count ?? payload.result?.row_count ?? compactRows.length;

  return {
    columns: columnNames,
    rows: compactRows.slice(0, 5000),
    rowCount
  };
}
