"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Calendar, 
  ShoppingBag, 
  Gift,
  Clock,
  Tag,
  Info,
  CheckCheck
} from "lucide-react";
import { 
  useNotifications, 
  useUnreadNotificationsCount, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead,
  AppNotification 
} from "@/hooks/use-notifications";
import { useAuthStore } from "@/stores/auth-store";
import { formatLoyaltyCopy } from "@/lib/loyalty-copy";

function formatRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}

function getNotificationIcon(type: AppNotification["type"]) {
  switch (type) {
    case "BOOKING":
      return <Calendar className="w-4 h-4 text-emerald-600" />;
    case "ORDER":
      return <ShoppingBag className="w-4 h-4 text-blue-600" />;
    case "LOYALTY":
      return <Gift className="w-4 h-4 text-amber-600" />;
    case "REMINDER":
      return <Clock className="w-4 h-4 text-orange-600" />;
    case "PROMO":
      return <Tag className="w-4 h-4 text-purple-600" />;
    default:
      return <Info className="w-4 h-4 text-slate-600" />;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    setIsOpen(false);

    if (item.type === "BOOKING") {
      if (user.role === "ADMIN" || user.role === "STAFF") {
        router.push("/admin/bookings");
      } else {
        router.push("/tai-khoan");
      }
    } else if (item.type === "ORDER") {
      if (user.role === "ADMIN" || user.role === "STAFF") {
        router.push("/admin/orders");
      } else {
        router.push("/tai-khoan");
      }
    } else {
      router.push("/tai-khoan");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2.5 rounded-full border border-[#E8E5DE] bg-white text-[#1A1F1E] hover:border-[#1D7980] hover:text-[#1D7980] transition-colors cursor-pointer flex items-center justify-center"
        aria-label="Thông báo"
        title="Thông báo"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#EE6952] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="fixed inset-x-3 top-[5.5rem] z-50 flex max-h-[calc(100dvh-6.5rem)] w-auto flex-col overflow-hidden rounded-2xl border border-[#E8E5DE] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-96">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#E8E5DE] bg-[#FAFAF7] px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1A1F1E]">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#1D7980]/10 text-[#1D7980] rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-[#1D7980] hover:text-[#135257] font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 divide-y divide-[#E8E5DE]/60 overflow-y-auto overscroll-contain sm:max-h-96 sm:flex-none">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-[#8C827A]">
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-[#F2F7F6] text-[#1D7980] flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5 opacity-60" />
                </div>
                <p className="text-xs font-semibold text-[#1A1F1E]">Chưa có thông báo nào</p>
                <p className="text-[11px] text-[#8C827A] mt-0.5">
                  Thông báo về lịch hẹn và tài khoản sẽ xuất hiện tại đây
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-[#F8FAF9] transition-colors cursor-pointer group ${
                    !item.isRead ? "bg-[#F2F7F6]/50" : ""
                  }`}
                >
                  {/* Icon badge */}
                  <div className="p-2 rounded-xl bg-white border border-[#E8E5DE] shadow-xs shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${!item.isRead ? "font-bold text-[#1A1F1E]" : "font-medium text-[#4A5553]"}`}>
                        {item.type === "LOYALTY" ? formatLoyaltyCopy(item.title) : item.title}
                      </p>
                      <span className="text-[10px] text-[#8C827A] shrink-0 whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#66706E] line-clamp-2 mt-0.5 leading-snug">
                      {item.type === "LOYALTY" ? formatLoyaltyCopy(item.body) : item.body}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!item.isRead && (
                    <div className="w-2 h-2 rounded-full bg-[#1D7980] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#E8E5DE] bg-[#FAFAF7] px-4 py-2.5 text-center">
            <Link
              href="/tai-khoan"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#1D7980] hover:underline"
            >
              Xem lịch sử & tài khoản →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
