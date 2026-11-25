import { describe, expect, it } from "bun:test";
import { getAiChatStatus } from "./ai-chat-status";

describe("getAiChatStatus", () => {
  it("shows only the lookup state while the request is opening the stream", () => {
    expect(getAiChatStatus({ isLoading: true, isStreaming: true })).toBe("searching");
  });

  it("switches to the response state after the stream opens", () => {
    expect(getAiChatStatus({ isLoading: false, isStreaming: true })).toBe("thinking");
  });

  it("shows no activity after the response finishes", () => {
    expect(getAiChatStatus({ isLoading: false, isStreaming: false })).toBeNull();
  });
});
