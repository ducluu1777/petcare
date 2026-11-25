"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAiChat } from "@/hooks/use-ai-chat";
import {
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Send,
  Square,
  Bot,
  User,
  Copy,
  Check,
  Calendar,
  ShoppingBag,
  ArrowRight,
  Clock,
  Scissors,
  Heart,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAiChatStatus } from "@/lib/ai-chat-status";
import { AiProductChoices } from './AiProductChoices';
import { AiBookingChoices } from './AiBookingChoices';

interface AiChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const HERO_FEATURE_CARDS = [
  {
    icon: Scissors,
    title: "Tham khảo giá Spa",
    desc: "Tra giá theo dịch vụ và cân nặng ước tính",
    query: "Tư vấn cho mình bảng giá dịch vụ tắm và cắt tỉa theo cân nặng",
    color: "bg-[#E8F4F5] text-[#1D7980] border-[#1D7980]/20",
  },
  {
    icon: Clock,
    title: "Xem khung giờ trống",
    desc: "Kiểm tra giờ còn nhận lịch hôm nay",
    query: "Hôm nay tại PetCare còn những khung giờ spa nào trống?",
    color: "bg-[#FFF4F0] text-[#EE6952] border-[#EE6952]/20",
  },
  {
    icon: Heart,
    title: "Sản phẩm cho thú cưng",
    desc: "Tra giá và hàng còn tại cửa hàng",
    query: "Gợi ý thức ăn và sản phẩm chăm sóc phù hợp cho bé",
    color: "bg-[#F2F7F6] text-[#135257] border-[#135257]/20",
  },
];

const QUICK_CHIPS = [
  { label: "Bảng giá theo kg", query: "Bảng giá dịch vụ spa tính theo các nấc cân nặng như thế nào?" },
  { label: "Giờ trống hôm nay", query: "Hôm nay tại PetCare còn những ca spa nào trống?" },
  { label: "Thức ăn & chăm sóc", query: "Gợi ý thức ăn và sản phẩm chăm sóc phù hợp cho bé" },
  { label: "Thú cưng của tôi", query: "Kiểm tra thông tin thú cưng của tôi trong tài khoản" },
  { label: "Cách đặt lịch", query: "Mình cần làm gì để đặt lịch Spa cho bé?" },
];

const stripAssistantEmojis = (content: string) =>
  content
    .replace(/[#*0-9]\uFE0F?\u20E3/gu, "")
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}\p{Emoji_Modifier}\uFE0F\u200D]/gu,
      "",
    );

// Helper: render inline bold, italic, and links with interactive buttons
function renderInlineFormatting(text: string) {
  // Regex match bold **...**, links [...](...), or regular text
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, i) => {
    // Match Link: [Label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const href = linkMatch[2];
      const isInternalAction = href.startsWith("/");

      if (isInternalAction) {
        return (
          <Link
            key={i}
            href={href}
            className="inline-flex max-w-full flex-wrap items-center gap-1.5 px-3 py-1 my-0.5 rounded-full bg-[#1D7980] hover:bg-[#135257] text-white text-[11px] font-bold shadow-2xs transition-all mx-1 group/btn"
          >
            {href.includes("dat-lich") ? (
              <Calendar className="w-3 h-3 text-[#85B079]" />
            ) : href.includes("cua-hang") ? (
              <ShoppingBag className="w-3 h-3 text-[#85B079]" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        );
      }

      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-words text-[#1D7980] font-bold underline hover:text-[#135257] mx-0.5 [overflow-wrap:anywhere]"
        >
          {label}
        </a>
      );
    }

    // Match Bold: **text**
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={i} className="font-bold text-[#1A1F1E]">
          {boldMatch[1]}
        </strong>
      );
    }

    return part;
  });
}

// Helper: Render structured blocks (cards, bullets, action pills)
function renderRichMessage(content: string) {
  const lines = content.split("\n");

  return (
    <div className="min-w-0 space-y-1.5 break-words text-xs leading-relaxed text-[#1A1F1E] [overflow-wrap:anywhere]">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // Action Line (starts with 👉 or contains markdown buttons)
        if (trimmed.startsWith("👉") || (trimmed.includes("[") && trimmed.includes("](") && trimmed.includes("/"))) {
          return (
            <div
              key={lineIdx}
              className="p-2.5 my-2 rounded-2xl bg-[#F2F7F6] border border-[#1D7980]/15 flex flex-wrap items-center gap-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {renderInlineFormatting(trimmed.replace(/^👉\s*/, ""))}
              </div>
            </div>
          );
        }

        // Bullet Point with Price (e.g. - **Item** — 180.000 đ)
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const itemText = trimmed.replace(/^[-*]\s+/, "");

          // If line has price separator "—" or "đ"
          if (itemText.includes("—") || itemText.includes("đ")) {
            return (
              <div
                key={lineIdx}
                className="min-w-0 p-2 rounded-xl bg-white border border-[#E8E5DE] my-1 flex items-center gap-2 shadow-2xs hover:border-[#1D7980]/40 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1D7980] shrink-0" />
                  <span className="min-w-0 break-words text-[11px] font-medium text-[#1A1F1E]">
                    {renderInlineFormatting(itemText)}
                  </span>
                </div>
              </div>
            );
          }

          // Normal bullet item
          return (
            <div key={lineIdx} className="flex min-w-0 items-start gap-2 py-0.5 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D7980] mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1 break-words text-[11px]">
                {renderInlineFormatting(itemText)}
              </div>
            </div>
          );
        }

        // Normal Paragraph
        return (
          <p key={lineIdx} className="break-words text-[11px] leading-relaxed text-[#1A1F1E]/90">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export function AiChatWidget({ isOpen, onClose }: AiChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { messages, isStreaming, isLoading, sendMessage, stopStream, clearChat, completeWorkflow } = useAiChat();
  const aiChatStatus = getAiChatStatus({ isLoading, isStreaming });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const messageList = messagesEndRef.current?.parentElement;
    messageList?.scrollTo({ top: messageList.scrollHeight, behavior: "smooth" });
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 150);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  const handlePromptClick = (query: string) => {
    sendMessage(query);
  };

  const handleCopyMessage = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div
      data-ai-chat-widget
      className={cn(
        "fixed z-50 flex min-w-0 flex-col overflow-hidden bg-white border border-[#E8E5DE] shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95",
        isExpanded
          ? "inset-3 sm:inset-6 md:inset-10 rounded-3xl max-w-5xl mx-auto"
          : "bottom-4 sm:bottom-20 right-2 sm:right-6 w-[calc(100vw-16px)] sm:w-[450px] h-[640px] max-h-[85vh] rounded-3xl"
      )}
      style={{ boxShadow: "0 25px 60px -15px rgba(29, 121, 128, 0.3)" }}
      aria-label="Cửa sổ trò chuyện Trợ lý AI"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#135257] to-[#1D7980] text-white rounded-t-3xl border-b border-white/10 shrink-0">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative w-10 h-10 shrink-0 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 text-[#85B079]">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-white tracking-tight">Trợ lý AI PetCare</h3>
            </div>
            <p className="break-words text-[11px] text-white/80">PetCare · Giá tham khảo và giờ trống</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 text-white/80">
          <button
            type="button"
            onClick={clearChat}
            className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Làm mới cuộc trò chuyện"
            aria-label="Làm mới"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer hidden sm:block"
            title={isExpanded ? "Thu nhỏ cửa sổ" : "Mở rộng toàn màn hình"}
            aria-label={isExpanded ? "Thu nhỏ" : "Phóng to"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Đóng cửa sổ chat"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 bg-[#FAFAF7]/80">
        
        {/* Visual Hero Feature Cards: Only shown when chat is fresh */}
        {messages.length <= 1 && (
          <div className="mb-4 p-4 rounded-3xl bg-white border border-[#E8E5DE] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1D7980] tracking-wide">
              <Bot className="w-3.5 h-3.5 text-[#1D7980]" />
              <span>Gợi ý tra cứu nhanh</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {HERO_FEATURE_CARDS.map((card, idx) => {
                const IconComponent = card.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePromptClick(card.query)}
                    className="min-w-0 p-3 rounded-2xl bg-[#FAFAF7] hover:bg-[#E8F4F5] border border-[#E8E5DE] hover:border-[#1D7980]/40 flex items-center justify-between gap-3 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", card.color)}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1A1F1E] group-hover:text-[#1D7980] transition-colors">
                          {card.title}
                        </div>
                        <div className="break-words text-[10px] leading-4 text-[#66706E]">
                          {card.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 text-[#66706E] group-hover:text-[#1D7980] group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg, messageIndex) => {
          const isUser = msg.role === "user";
          const activeWorkflow = !messages.slice(messageIndex + 1).some(message => message.role === 'user');
          return (
            <div
              key={msg.id}
              className={cn("flex w-full min-w-0 gap-2.5 items-start", isUser ? "flex-row-reverse" : "flex-row")}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs",
                  isUser ? "bg-[#EE6952] text-white" : "bg-[#1D7980] text-white"
                )}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble Container */}
              <div
                className={cn(
                  "relative min-w-0 w-fit max-w-[calc(100%-2.75rem)] break-words rounded-3xl p-4 shadow-xs transition-all",
                  isUser
                    ? "bg-[#1D7980] text-white rounded-tr-xs"
                    : "bg-white border border-[#E8E5DE] rounded-tl-xs"
                )}
              >
                {isUser ? (
                  <p className="break-words text-xs whitespace-pre-wrap leading-relaxed text-white font-medium [overflow-wrap:anywhere]">
                    {msg.content}
                  </p>
                ) : (
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    {/* Header bar on Assistant Message */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8E5DE]/60 text-[10px] text-[#66706E]">
                      <span className="min-w-0 font-bold text-[#1D7980] flex items-center gap-1">
                        <Bot className="w-3 h-3 text-[#1D7980]" /> Trợ lý AI PetCare
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="shrink-0 hover:text-[#1D7980] transition-colors p-1 rounded-md cursor-pointer"
                        title="Sao chép nội dung"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Rich Formatted Body */}
                    {renderRichMessage(
                      msg.role === "assistant"
                        ? stripAssistantEmojis(msg.content)
                        : msg.content,
                    )}

                    {!msg.isStreaming && msg.workflow?.kind === 'products' && <AiProductChoices workflow={msg.workflow} active={activeWorkflow} onCompleted={content => completeWorkflow(msg.id, content)} />}
                    {!msg.isStreaming && msg.workflow?.kind === 'booking' && <AiBookingChoices workflow={msg.workflow} active={activeWorkflow} onCompleted={content => completeWorkflow(msg.id, content)} />}

                    {/* Blinking Cursor during Streaming */}
                    {msg.isStreaming && aiChatStatus === "thinking" && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#1D7980] font-semibold">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#1D7980] animate-pulse" />
                        <span>Đang phản hồi...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking State */}
        {aiChatStatus === "searching" && (
          <div className="flex gap-2.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-[#1D7980] text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-[#E8E5DE] rounded-2xl rounded-tl-xs p-3.5 flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#1D7980] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-[#1D7980] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-[#1D7980] animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-[11px] text-[#66706E] font-medium ml-1">Đang tra cứu dữ liệu tiệm...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Quick Chips */}
      {!isStreaming && (
        <div className="px-4 py-2.5 border-t border-[#E8E5DE]/80 bg-white/95 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePromptClick(chip.query)}
                className="px-3 py-1.5 rounded-full bg-[#FAFAF7] hover:bg-[#E8F4F5] border border-[#E8E5DE] hover:border-[#1D7980] text-[11px] font-bold text-[#1A1F1E] hover:text-[#1D7980] transition-all shrink-0 shadow-2xs cursor-pointer active:scale-95"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-white rounded-b-3xl border-t border-[#E8E5DE] flex items-center gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isStreaming ? "Đang trả lời..." : "Hỏi về dịch vụ, giá, giờ trống hoặc sản phẩm..."}
          disabled={isStreaming}
          className="flex-1 px-4 py-3 text-xs bg-[#FAFAF7] border border-[#E8E5DE] rounded-2xl focus:outline-none focus:border-[#1D7980] focus:ring-1 focus:ring-[#1D7980] text-[#1A1F1E] placeholder:text-[#66706E]"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={stopStream}
            className="w-10 h-10 rounded-2xl bg-[#EE6952] hover:bg-[#D9533D] text-white flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
            title="Dừng phản hồi"
            aria-label="Dừng phản hồi"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-xs",
              input.trim()
                ? "bg-[#1D7980] hover:bg-[#135257] text-white cursor-pointer active:scale-95"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
            title="Gửi tin nhắn"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
}
