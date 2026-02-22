import { describe, expect, it } from "vitest";
import {
  buildAssistantMessage,
  buildUserMessage,
  isNearBottom
} from "@/components/command-center/tabs/insights-chat-utils";

describe("insights chat utils", () => {
  it("builds user and assistant messages", () => {
    const user = buildUserMessage("Test question", 1000);
    expect(user.role).toBe("user");
    expect(user.text).toBe("Test question");
    expect(user.createdAt).toBe(1000);

    const assistant = buildAssistantMessage(
      {
        headline: "General Insight",
        summary: "Coverage is low.",
        keyPoints: [],
        actions: [],
        followups: [],
        metricHighlights: []
      },
      2000
    );
    expect(assistant.role).toBe("assistant");
    expect(assistant.text).toBe("Coverage is low.");
    expect(assistant.createdAt).toBe(2000);
  });

  it("detects when list is near bottom", () => {
    expect(isNearBottom({ scrollTop: 880, clientHeight: 120, scrollHeight: 1000 })).toBe(true);
    expect(isNearBottom({ scrollTop: 600, clientHeight: 120, scrollHeight: 1000 })).toBe(false);
  });
});

