export type AiChatStatus = "searching" | "thinking" | null;

export function getAiChatStatus({
  isLoading,
  isStreaming,
}: {
  isLoading: boolean;
  isStreaming: boolean;
}): AiChatStatus {
  if (isLoading) return "searching";
  if (isStreaming) return "thinking";
  return null;
}
