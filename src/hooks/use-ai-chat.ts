"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatWorkflow } from '@/lib/ai-workflow';
import { clearIdempotencyKey, getIdempotencyKey } from "@/lib/idempotency-key";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  workflow?: ChatWorkflow;
  requestId?: string;
  failed?: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const INITIAL_WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Chào bạn, mình là **Trợ lý AI của PetCare**. Mình giúp bạn chọn sản phẩm, thêm giỏ và chọn lịch Spa ngay tại đây. Mọi lịch hẹn đều có bước xem lại và xác nhận của bạn.\n\nBạn đang cần gì cho bé?",
  createdAt: new Date().toISOString(),
};

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("petcare_ai_messages");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return [INITIAL_WELCOME];
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync state to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("petcare_ai_messages", JSON.stringify(messages));
      } catch {
        // ignore
      }
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text || isStreaming) return;

      const lastMessage = messages[messages.length - 1];
      const previousUserMessage = messages[messages.length - 2];
      const retryingFailedTurn =
        lastMessage?.role === "assistant" && lastMessage.failed === true &&
        previousUserMessage?.role === "user" && previousUserMessage.content === text;
      const historyMessages = retryingFailedTurn ? messages.slice(0, -2) : messages;
      const history = historyMessages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          content: m.content,
        }));
      const requestId = retryingFailedTurn && previousUserMessage?.requestId
        ? previousUserMessage.requestId
        : getIdempotencyKey("ai-chat", { message: text, history });

      const userMsg: ChatMessage = retryingFailedTurn && previousUserMessage
        ? { ...previousUserMessage, requestId }
        : {
            id: `u-${Date.now()}`,
            role: "user",
            content: text,
            createdAt: new Date().toISOString(),
            requestId,
          };

      const assistantId = `a-${Date.now()}`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => retryingFailedTurn
        ? [...prev.slice(0, -2), userMsg, assistantPlaceholder]
        : [...prev, userMsg, assistantPlaceholder]);
      setIsStreaming(true);
      setIsLoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let token: string | null = null;
        if (typeof window !== "undefined") {
          token = localStorage.getItem("petcare_token");
        }

        let streamFailed = false;

        const res = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": requestId,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: text,
            history,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Máy chủ phản hồi mã lỗi ${res.status}`);
        }

        setIsLoading(false);

        if (!res.body) {
          throw new Error("Không nhận được luồng dữ liệu từ máy chủ");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === "[DONE]") {
              if (!streamFailed) clearIdempotencyKey("ai-chat", { message: text, history });
              setIsStreaming(false);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              );
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.workflow && ['products', 'booking'].includes(parsed.workflow.kind)) {
                setMessages(prev => prev.map(message => message.id === assistantId ? { ...message, workflow: parsed.workflow } : message));
              }
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                );
              }
              if (parsed.error) {
                streamFailed = true;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content:
                            m.content ||
                            `Mình chưa thể trả lời lúc này: ${parsed.error}. Bạn thử lại hoặc gọi 0941 900 966 để gặp nhân viên PetCare.`,
                          isStreaming: false,
                          failed: true,
                        }
                      : m
                  )
                );
              }
            } catch {
              // Ignore JSON parse errors on partial stream lines
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Người dùng chủ động dừng luồng
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      m.content ||
                      "Mình chưa thể kết nối để trả lời lúc này. Bạn thử lại hoặc gọi 0941 900 966 để gặp nhân viên PetCare.",
                    isStreaming: false,
                    failed: true,
                  }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setIsLoading(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
      }
    },
    [isStreaming, messages]
  );

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    stopStream();
    setMessages([INITIAL_WELCOME]);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("petcare_ai_messages");
    }
  }, [stopStream]);

  const completeWorkflow = useCallback((messageId: string, content: string) => {
    setMessages(previous => previous.map(message => message.id === messageId ? { ...message, content, workflow: undefined } : message));
  }, []);

  return {
    messages,
    isStreaming,
    isLoading,
    sendMessage,
    stopStream,
    clearChat,
    completeWorkflow,
  };
}
