import { describe, expect, it } from "bun:test";
import { getAiTokenMetrics } from "./ai-token-usage";

describe("getAiTokenMetrics", () => {
  it("returns unavailable values when the API has no token usage summary", () => {
    expect(getAiTokenMetrics(undefined)).toEqual([
      { label: "Token đầu vào", value: null },
      { label: "Token đầu ra", value: null },
      { label: "Tổng token", value: null },
    ]);
  });

  it("preserves token counts returned by the API", () => {
    expect(getAiTokenMetrics({ inputTokens: 120, outputTokens: 24, totalTokens: 144 })).toEqual([
      { label: "Token đầu vào", value: 120 },
      { label: "Token đầu ra", value: 24 },
      { label: "Tổng token", value: 144 },
    ]);
  });
});
