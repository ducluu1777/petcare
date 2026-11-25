import { Check, CheckCircle2, Clock, MapPin, X } from "lucide-react";
import type { AdminBookingStatus } from "@/lib/admin-booking-record";

export function BookingStatusBadge({ status }: { status: AdminBookingStatus }) {
  switch (status) {
    case "WAITING_CHECKIN":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-amber-500" />
          Đã đặt
        </span>
      );
    case "ARRIVED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
          <MapPin aria-hidden="true" className="size-3.5" />
          Đã tiếp nhận
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
          <span aria-hidden="true" className="size-1.5 animate-ping rounded-full bg-primary" />
          Đang chăm sóc
        </span>
      );
    case "READY_FOR_PICKUP":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          <CheckCircle2 aria-hidden="true" className="size-3.5 text-emerald-600" />
          Chờ khách nhận
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          <Check aria-hidden="true" className="size-3 text-slate-500" />
          Hoàn tất
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          <X aria-hidden="true" className="size-3 text-rose-500" />
          Đã hủy
        </span>
      );
    case "NO_SHOW":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">
          <Clock aria-hidden="true" className="size-3.5" />
          Không đến
        </span>
      );
  }
}
