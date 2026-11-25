import type { CalendarStatusPresentation } from "@/components/admin/bookings/calendar-month-day-cell";
import type { BookingRecord } from "@/lib/admin-booking-record";

export function getCalendarStatusPresentation(status: BookingRecord["status"]): CalendarStatusPresentation {
  switch (status) {
    case "WAITING_CHECKIN":
      return {
        bg: "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900",
        dot: "bg-amber-500",
        label: "Đã đặt",
      };
    case "ARRIVED":
      return {
        bg: "bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-900",
        dot: "bg-sky-600",
        label: "Đã tiếp nhận",
      };
    case "IN_PROGRESS":
      return {
        bg: "bg-teal-50 hover:bg-teal-100/80 border-teal-200 text-teal-900",
        dot: "bg-teal-600 animate-pulse",
        label: "Đang chăm sóc",
      };
    case "READY_FOR_PICKUP":
      return {
        bg: "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900",
        dot: "bg-emerald-600",
        label: "Chờ khách nhận",
      };
    case "COMPLETED":
      return {
        bg: "bg-slate-50 hover:bg-slate-100 border-border-subtle text-slate-700",
        dot: "bg-slate-400",
        label: "Hoàn tất",
      };
    case "CANCELLED":
      return {
        bg: "bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-800",
        dot: "bg-rose-400",
        label: "Đã hủy",
      };
    case "NO_SHOW":
      return {
        bg: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900",
        dot: "bg-orange-500",
        label: "Không đến",
      };
    default:
      return {
        bg: "bg-slate-50 border-border-subtle text-slate-600",
        dot: "bg-slate-400",
        label: "Không xác định",
      };
  }
}
