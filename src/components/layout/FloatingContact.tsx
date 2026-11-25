"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, X, Bot } from "lucide-react";
import { AiChatWidget } from "@/components/ai/AiChatWidget";
import { shouldFloatContact } from "@/lib/floating-contact-layout";

export function FloatingContact() {
  const pathname = usePathname();
  const isFloating = shouldFloatContact(pathname);
  const [isHotlineOpen, setIsHotlineOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [primaryActionVisibility, setPrimaryActionVisibility] = useState({
    pathname: null as string | null,
    visible: false,
  });
  const isPrimaryActionVisible =
    primaryActionVisibility.pathname === pathname && primaryActionVisibility.visible;

  // Lắng nghe sự kiện mở AI Chat từ Header, trang Liên Hệ hoặc CTA khác
  useEffect(() => {
    const handleOpenAi = () => setIsAiOpen(true);
    window.addEventListener("open-ai-chat", handleOpenAi);
    return () => window.removeEventListener("open-ai-chat", handleOpenAi);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/admin") || typeof IntersectionObserver === "undefined") return;

    const syncVisibility = (visible: boolean) => {
      setPrimaryActionVisibility({ pathname, visible });
      if (visible) {
        setIsHotlineOpen(false);
        setIsAiOpen(false);
      }
    };

    const visibleTargets = new Set<Element>();
    const observedTargets = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleTargets.add(entry.target);
          else visibleTargets.delete(entry.target);
        });
        syncVisibility(visibleTargets.size > 0);
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );

    const syncTargets = () => {
      const nextTargets = new Set(
        Array.from(document.querySelectorAll(
          "[data-floating-contact-safe-zone], form button[type='submit'], img[alt^='Mã QR thanh toán đơn']",
        )).filter((target) => !target.closest("[data-ai-chat-widget]")),
      );

      observedTargets.forEach((target) => {
        if (nextTargets.has(target)) return;
        observer.unobserve(target);
        observedTargets.delete(target);
        visibleTargets.delete(target);
      });

      nextTargets.forEach((target) => {
        if (observedTargets.has(target)) return;
        observer.observe(target);
        observedTargets.add(target);
      });
    };

    syncTargets();
    const mutationObserver = new MutationObserver(() => {
      syncTargets();
      syncVisibility(visibleTargets.size > 0);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  // Ẩn hoàn toàn trên giao diện quản trị Admin
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <aside
        aria-label="Hỗ trợ nhanh & Trợ lý AI"
        aria-hidden={isPrimaryActionVisible}
        inert={isPrimaryActionVisible}
        className={`z-40 flex flex-col items-end gap-3 pointer-events-auto transition-opacity duration-200 ${
          isPrimaryActionVisible ? "pointer-events-none opacity-0" : "opacity-100"
        } ${
          isFloating ? "fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] sm:right-6 sm:bottom-6" : "relative mt-6 mr-4 mb-4"
        }`}
      >
        {/* Expanded Quick Contact Popover */}
        {isHotlineOpen && (
          <div className="bg-white rounded-3xl p-5 border border-[#E8E5DE] shadow-2xl w-[min(18rem,calc(100vw-2rem))] mb-1 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DE]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1A1F1E]">Liên hệ PetCare</span>
              </div>
              <button
                onClick={() => setIsHotlineOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-[#66706E]"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              <a
                href="tel:0941900966"
                className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#FAFAF7] hover:bg-[#E8F4F5] border border-[#E8E5DE] transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#1D7980] border border-[#E8E5DE] shrink-0 font-bold text-xs group-hover:bg-[#1D7980] group-hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1F1E]">Gọi trực tiếp</div>
                  <div className="text-[11px] text-[#1D7980] font-semibold">0941 900 966</div>
                  <div className="text-[10px] text-[#66706E] mt-0.5">38 Cầu Giấy, Hà Nội</div>
                </div>
              </a>

              <Link
                href="/dat-lich"
                onClick={() => setIsHotlineOpen(false)}
                className="btn-tactile w-full py-2.5 rounded-xl bg-[#1D7980] hover:bg-[#135257] text-white font-bold text-xs flex items-center justify-center shadow-sm"
              >
                Đặt lịch
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsHotlineOpen(false);
                  setIsAiOpen(true);
                }}
                className="w-full py-2.5 rounded-xl border border-[#E8E5DE] bg-white hover:bg-[#FAFAF7] text-[#1D7980] font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Bot className="w-4 h-4" />
                Hỏi trợ lý AI
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons Trigger */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsHotlineOpen(!isHotlineOpen);
              if (isAiOpen) setIsAiOpen(false);
            }}
            className="flex sm:hidden w-11 h-11 rounded-full bg-gradient-to-r from-[#1D7980] to-[#135257] text-white items-center justify-center shadow-xl border border-white/20 transition-transform hover:scale-105 cursor-pointer"
            aria-label="Mở tùy chọn hỗ trợ"
          >
            <Bot className="w-5 h-5" />
          </button>

          {/* Nút Trợ lý AI */}
          <button
            onClick={() => {
              setIsAiOpen(!isAiOpen);
              if (isHotlineOpen) setIsHotlineOpen(false);
            }}
            className="group relative hidden sm:flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full bg-gradient-to-r from-[#1D7980] to-[#135257] text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-white/20 cursor-pointer"
            aria-label="Mở Trợ lý AI PetCare"
          >
            <div className="relative">
              <Bot className="w-4 h-4 text-[#85B079]" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#85B079] border border-[#135257]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold leading-tight">Trợ lý AI</span>
              <span className="text-[9px] text-[#85B079] font-semibold leading-none">Hỏi về dịch vụ</span>
            </div>
          </button>

          {/* Pulse Floating Hotline Button */}
          <button
            onClick={() => {
              setIsHotlineOpen(!isHotlineOpen);
              if (isAiOpen) setIsAiOpen(false);
            }}
            className="relative hidden sm:flex w-11 h-11 rounded-full bg-[#EE6952] hover:bg-[#D9533D] text-white items-center justify-center shadow-xl pulse-halo transition-transform hover:scale-105 cursor-pointer"
            aria-label="Mở danh bạ hotline"
          >
            <Phone className="w-5 h-5 text-white" />
          </button>
        </div>
      </aside>

      {/* AI Chat Drawer Widget */}
      <AiChatWidget isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </>
  );
}
