type AiTokenUsage = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
} | null;

export function getAiTokenMetrics(usage: AiTokenUsage | undefined) {
  return [
    { label: "Token đầu vào", value: usage?.inputTokens ?? null },
    { label: "Token đầu ra", value: usage?.outputTokens ?? null },
    { label: "Tổng token", value: usage?.totalTokens ?? null },
  ];
}
