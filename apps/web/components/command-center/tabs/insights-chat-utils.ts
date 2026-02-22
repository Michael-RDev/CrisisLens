import type { InsightsResult } from "@/lib/services/databricks";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  result?: InsightsResult;
  createdAt: number;
};

function messageId(prefix: "u" | "a", createdAt: number) {
  return `${prefix}-${createdAt}-${Math.random().toString(16).slice(2, 8)}`;
}

export function buildUserMessage(text: string, createdAt = Date.now()): AssistantMessage {
  return {
    id: messageId("u", createdAt),
    role: "user",
    text: text.trim(),
    createdAt
  };
}

export function buildAssistantMessage(result: InsightsResult, createdAt = Date.now()): AssistantMessage {
  const summary = result.summary?.trim();
  const headline = result.headline?.trim();
  return {
    id: messageId("a", createdAt),
    role: "assistant",
    text: summary || headline || "No summary was returned.",
    result,
    createdAt
  };
}

export function isNearBottom(input: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  threshold?: number;
}): boolean {
  const threshold = input.threshold ?? 88;
  return input.scrollTop + input.clientHeight >= input.scrollHeight - threshold;
}

