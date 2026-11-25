import { MessageSquare, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BookingStatusBadge } from "@/components/admin/bookings/booking-status-badge";
import type { BookingRecord } from "@/lib/admin-booking-record";

type BookingDetailHeaderProps = {
  booking: BookingRecord;
  onPrint: () => void;
  onOpenChat: () => void;
};

export function BookingDetailHeader({ booking, onPrint, onOpenChat }: BookingDetailHeaderProps) {
  return (
    <SheetHeader className="shrink-0 border-b border-border-subtle bg-surface p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="outline" className="shrink-0 bg-slate-100 px-3 py-1 text-sm font-bold text-ink">
            {booking.code}
          </Badge>
          <span className="shrink-0 whitespace-nowrap rounded border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-primary">
            Phiếu dịch vụ Spa
          </span>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            onClick={onPrint}
            title="In phiếu dịch vụ giao cho kỹ thuật viên thực hiện"
            variant="outline"
            className="h-10 gap-1.5 whitespace-nowrap rounded-lg border-border-subtle px-3 text-sm font-semibold shadow-xs hover:bg-slate-100"
          >
            <Printer aria-hidden="true" className="size-3.5 text-muted-text" />
            <span>In phiếu dịch vụ</span>
          </Button>
          <Button
            type="button"
            onClick={onOpenChat}
            title="Mở Zalo với khách hàng"
            variant="outline"
            className="h-10 gap-1.5 whitespace-nowrap rounded-lg border-teal-200 bg-teal-50/50 px-3 text-sm font-semibold text-primary shadow-xs hover:bg-teal-100/70"
          >
            <MessageSquare aria-hidden="true" className="size-3.5" />
            <span>Mở Zalo</span>
          </Button>
        </div>
      </div>

      <div className="mt-2">
        <SheetTitle className="text-lg font-bold text-ink">{booking.service.title}</SheetTitle>
        <SheetDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-text">
          <span>{booking.type === "SPA" ? "Giờ khách dự kiến đến:" : "Thời gian hẹn:"} <strong className="text-ink">{booking.service.scheduledTime}</strong></span>
        </SheetDescription>
      </div>
    </SheetHeader>
  );
}
