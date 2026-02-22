const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_POLL_INTERVAL_MS = 1_500;
// Required server-side env vars:
// DATABRICKS_HOST, DATABRICKS_TOKEN, GENIE_SPACE_ID

export type GenieAttachment = {
  attachment_id: string;
  [key: string]: unknown;
};

export type GenieMessage = {
  id: string;
  status: string;
  content?: string;
  attachments?: GenieAttachment[];
  [key: string]: unknown;
};

export class GenieApiError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = "GenieApiError";
    this.status = status;
    this.details = details;
  }
}

export class GenieTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenieTimeoutError";
  }
}

function getConfig() {
  const host = process.env.DATABRICKS_HOST?.trim();
  const token = process.env.DATABRICKS_TOKEN?.trim();
  const spaceId = process.env.GENIE_SPACE_ID?.trim();

  if (!host || !token || !spaceId) {
    throw new Error("Missing Databricks Genie environment variables.");
  }

  return {
    host: host.replace(/\/$/, ""),
    token,
    spaceId
  };
}

async function genieFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { host, token } = getConfig();
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new GenieApiError("Databricks Genie request failed.", response.status, rawBody);
  }

  if (!rawBody) {
    return {} as T;
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return { content: rawBody } as T;
  }
}

export async function startConversation(content: string): Promise<{ conversationId: string; messageId: string }> {
  const { spaceId } = getConfig();
  const payload = await genieFetch<{ conversation_id: string; message_id: string }>(
    `/api/2.0/genie/spaces/${spaceId}/start-conversation`,
    {
      method: "POST",
      body: JSON.stringify({ content })
    }
  );

  return {
    conversationId: payload.conversation_id,
    messageId: payload.message_id
  };
}

export async function sendMessage(input: {
  conversationId: string;
  content: string;
}): Promise<{ messageId: string }> {
  const { spaceId } = getConfig();
  const payload = await genieFetch<{ id: string }>(
    `/api/2.0/genie/spaces/${spaceId}/conversations/${input.conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content: input.content })
    }
  );

  return { messageId: payload.id };
}

export async function getMessage(input: {
  conversationId: string;
  messageId: string;
}): Promise<GenieMessage> {
  const { spaceId } = getConfig();
  return genieFetch<GenieMessage>(
    `/api/2.0/genie/spaces/${spaceId}/conversations/${input.conversationId}/messages/${input.messageId}`,
    {
      method: "GET"
    }
  );
}

export async function pollMessageUntilComplete(input: {
  conversationId: string;
  messageId: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<GenieMessage> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const message = await getMessage({
      conversationId: input.conversationId,
      messageId: input.messageId
    });

    if (message.status === "COMPLETED") {
      return message;
    }

    if (message.status === "FAILED" || message.status === "CANCELLED") {
      throw new GenieApiError(`Genie message ${message.status.toLowerCase()}.`, 502, JSON.stringify(message));
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new GenieTimeoutError("Timed out waiting for Genie response.");
}

export async function getAttachmentRows(input: {
  conversationId: string;
  messageId: string;
  attachmentId: string;
}): Promise<Array<Record<string, unknown>>> {
  const { spaceId } = getConfig();
  const payload = await genieFetch<{
    rows?: Array<Record<string, unknown>>;
    result?: {
      rows?: Array<Record<string, unknown>>;
      data_array?: unknown[][];
      schema?: { columns?: Array<{ name?: string; position?: number }> };
    };
    data_array?: unknown[][];
    schema?: { columns?: Array<{ name?: string; position?: number }> };
    manifest?: { schema?: { columns?: Array<{ name?: string; position?: number }> } };
  }>(
    `/api/2.0/genie/spaces/${spaceId}/conversations/${input.conversationId}/messages/${input.messageId}/attachments/${input.attachmentId}/query-result`,
    {
      method: "GET"
    }
  );

  const objectRows =
    (Array.isArray(payload.rows) && payload.rows) ||
    (Array.isArray(payload.result?.rows) && payload.result?.rows) ||
    [];
  if (objectRows.length > 0) return objectRows;

  const dataArray =
    (Array.isArray(payload.data_array) && payload.data_array) ||
    (Array.isArray(payload.result?.data_array) && payload.result?.data_array) ||
    [];
  if (dataArray.length === 0) return [];

  const columns =
    payload.schema?.columns ??
    payload.result?.schema?.columns ??
    payload.manifest?.schema?.columns ??
    [];
  const columnNames = columns.map((col, index) => col.name?.trim() || `col_${index + 1}`);

  return dataArray.map((row) => {
    const values = Array.isArray(row) ? row : [];
    return columnNames.reduce<Record<string, unknown>>((acc, colName, index) => {
      acc[colName] = values[index];
      return acc;
    }, {});
  });
}

export async function listConversationMessages(input: {
  conversationId: string;
}): Promise<GenieMessage[]> {
  const { spaceId } = getConfig();
  const payload = await genieFetch<{ messages?: GenieMessage[] }>(
    `/api/2.0/genie/spaces/${spaceId}/conversations/${input.conversationId}/messages`,
    {
      method: "GET"
    }
  );

  return Array.isArray(payload.messages) ? payload.messages : [];
}

export function isWarehouseStoppedError(error: unknown): boolean {
  const message =
    error instanceof GenieApiError
      ? `${error.message} ${error.details ?? ""}`.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("warehouse") &&
    (message.includes("stopped") || message.includes("start") || message.includes("not running"))
  );
}
