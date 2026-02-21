import { describe, expect, it } from "vitest";
import {
  buildCountrySummaryPrompt,
  extractJsonObject,
  parseGenieSummaryText
} from "@/lib/genie/summary";

describe("genie summary helpers", () => {
  it("builds a deterministic prompt with country code and name", () => {
    const prompt = buildCountrySummaryPrompt({ countryCode: "eth", countryName: "Ethiopia" });
    expect(prompt).toContain("country code: ETH");
    expect(prompt).toContain("country name: Ethiopia");
    expect(prompt).toContain("summarySentences");
    expect(prompt).toContain("keyDrivers");
    expect(prompt).toContain("outliers");
  });

  it("extracts json payload from fenced markdown blocks", () => {
    const payload = "Here is output:\n```json\n{\"a\":1,\"b\":[2]}\n```";
    expect(extractJsonObject(payload)).toBe('{"a":1,"b":[2]}');
  });

  it("parses structured summary json and preserves optional top list", () => {
    const text = JSON.stringify({
      summarySentences: [
        "Sentence 1.",
        "Sentence 2.",
        "Sentence 3.",
        "Sentence 4.",
        "Sentence 5.",
        "Sentence 6."
      ],
      keyDrivers: ["Driver 1", "Driver 2", "Driver 3"],
      outliers: ["Outlier A", "Outlier B"],
      topList: [
        { label: "Cluster A", value: "42", note: "High delta" },
        { label: "Cluster B", value: "35", note: "Rising" }
      ]
    });

    const parsed = parseGenieSummaryText(text);
    expect(parsed.summaryText).toContain("Sentence 1.");
    expect(parsed.keyDrivers).toHaveLength(3);
    expect(parsed.outliers).toHaveLength(2);
    expect(parsed.topList).toHaveLength(2);
    expect(parsed.topList?.[0].label).toBe("Cluster A");
  });

  it("falls back to raw text when json cannot be parsed", () => {
    const parsed = parseGenieSummaryText("Plain text answer from genie");
    expect(parsed.summaryText).toBe("Plain text answer from genie");
    expect(parsed.keyDrivers).toEqual([]);
    expect(parsed.outliers).toEqual([]);
  });
});
