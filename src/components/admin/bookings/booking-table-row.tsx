import {
  AlertTriangle,
  Bed,
  ChevronRight,
  Clock,
  Phone,
  Scissors,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { BookingStatusBadge } from "@/components/admin/bookings/booking-status-badge";
import type { BookingRecord } from "@/lib/admin-booking-record";

type BookingTableRowProps = {
  booking: BookingRecord;
  onOpenDetail: (booking: BookingRecord) => void;
};

export function BookingTableRow({ booking, onOpenDetail }: BookingTableRowProps) {
  const bookingTime = booking.service.timeRange || booking.service.scheduledTime.split(" ")[0];
  const bookingSourceLabel = booking.source === "RECEPTIONIST"
    ? "Nhân viên đặt hộ"
    : booking.source === "WALK_IN"
      ? "Tiếp nhận tại quầy"
      : booking.source === "WEB"
        ? "Khách đặt trực tuyến"
        : null;
  const behavioralWarning = booking.pet.behavioralFlag === "AGGRESSIVE"
    ? "Cần chú ý khi thao tác"
    : booking.pet.behavioralFlag === "TIMID"
      ? "Dễ lo lắng khi chăm sóc"
      : null;

  return (
    <TableRow className="group border-border-subtle transition-colors hover:bg-slate-50">
      <TableCell className="align-top py-3.5">
        <div className="flex max-w-[130px] items-center gap-1.5 text-sm font-bold text-ink">
          {booking.type === "SPA" ? (
            <Scissors aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
          ) : (
            <Bed aria-hidden="true" className="size-3.5 shrink-0 text-amber-700" />
          )}
          <span className="truncate" title={booking.code}>{booking.code}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-text">
          <Clock aria-hidden="true" className="size-3" />
          <span>{bookingTime}</span>
        </div>
        {bookingSourceLabel && (
          <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
            {bookingSourceLabel}
          </span>
        )}
      </TableCell>

      <TableCell className="align-top py-3.5">
        <div className="flex items-start gap-2.5">
          <div aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-slate-100 text-xs font-bold text-primary">
            {booking.pet.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold leading-none text-ink">{booking.pet.name}</span>
              <span className="text-xs text-muted-text">({booking.pet.breed})</span>
              <span className="rounded border border-border-subtle bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                {booking.pet.weight == null ? "Chưa có cân nặng" : `${booking.pet.weight} kg`}
              </span>
            </div>
            {behavioralWarning && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-800">
                <AlertTriangle aria-hidden="true" className="size-2.5 text-rose-600" />
                {behavioralWarning}
              </span>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="align-top py-3.5">
        <p className="line-clamp-1 text-sm font-medium leading-snug text-ink">{booking.service.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-text">
          <span>Nhân viên: <strong className="font-semibold text-ink">{booking.service.assignedStaff}</strong></span>
        </div>
      </TableCell>

      <TableCell className="align-top py-3.5">
        <div className="flex max-w-[160px] items-center gap-1.5 text-sm font-bold text-ink">
          <User aria-hidden="true" className="size-3.5 shrink-0 text-muted-text" />
          <span className="truncate" title={booking.customer.name}>{booking.customer.name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-text">
          <Phone aria-hidden="true" className="size-3" />
          <span>{booking.customer.phone}</span>
        </div>
        <span className="mt-0.5 block text-xs font-semibold text-primary">{booking.customer.loyaltyPointsLabel}</span>
      </TableCell>

      <TableCell className="align-top py-3.5">
        <div className="tabular-nums text-sm font-bold text-ink">{booking.financial.finalAmount.toLocaleString("vi-VN")}₫</div>
        <div className="mt-1">
          {booking.financial.paymentStatus === "PAID" ? (
            <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              Đã thu{booking.financial.paidMethod ? ` (${booking.financial.paidMethod})` : ""}
            </span>
          ) : (
            <span className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">Chưa thanh toán</span>
          )}
        </div>
      </TableCell>

      <TableCell className="align-top py-3.5">
        <BookingStatusBadge status={booking.status} />
      </TableCell>

      <TableCell className="whitespace-nowrap pr-4 text-right align-top py-3.5">
        <Button
          type="button"
          onClick={() => onOpenDetail(booking)}
          variant="outline"
          className="h-10 gap-1 whitespace-nowrap rounded-lg border-border-subtle bg-surface px-2.5 text-sm font-bold text-primary shadow-xs hover:border-teal-200 hover:bg-teal-50"
          aria-label={`Mở chi tiết lịch ${booking.code}`}
        >
          <span>Mở chi tiết</span>
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
