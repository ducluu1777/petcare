"use client";

import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingRecord } from "@/lib/admin-booking-record";

interface CalendarDayBookingsDialogProps {
  date: string | null;
  dateLabel: string;
  bookings: BookingRecord[];
  isClosedDate: boolean;
  showClosedDates: boolean;
  todayStr: string;
  getStatusLabel: (status: BookingRecord["status"]) => string;
  onClose: () => void;
  onOpenDetail: (booking: BookingRecord) => void;
  onNewBooking: (date: string) => void;
}

export function CalendarDayBookingsDialog({
  date,
  dateLabel,
  bookings,
  isClosedDate,
  showClosedDates,
  todayStr,
  getStatusLabel,
  onClose,
  onOpenDetail,
  onNewBooking,
}: CalendarDayBookingsDialogProps) {
  const isPastDate = date !== null && date < todayStr;
  const cannotBook = date === null || isClosedDate || isPastDate;

  return (
    <Dialog
      open={date !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="flex-row items-start justify-between border-b border-border-subtle bg-slate-50 p-4 sm:p-5">
          <div className="space-y-1">
            <DialogTitle className="font-bold text-ink">Lịch ngày {dateLabel}</DialogTitle>
            <DialogDescription>Chọn một lịch để xem thông tin chi tiết.</DialogDescription>
            {date && isClosedDate && showClosedDates && (
              <p className="text-xs font-medium text-amber-800">Cơ sở nghỉ theo lịch đã cấu hình.</p>
            )}
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon-lg"
            aria-label="Đóng danh sách lịch trong ngày"
            className="rounded-lg text-muted-text hover:bg-slate-200 hover:text-ink"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </DialogHeader>

        <div data-lenis-prevent className="max-h-[60dvh] space-y-2 overflow-y-auto p-4 overscroll-contain scrollbar-thin">
          {bookings.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-muted-text">Ngày này chưa có lịch hẹn.</p>
          ) : bookings.map((booking) => (
            <Button
              key={booking.id}
              type="button"
              variant="ghost"
              onClick={() => {
                onClose();
                onOpenDetail(booking);
              }}
              aria-label={`Mở lịch ${booking.code} của ${booking.pet.name}, trạng thái ${getStatusLabel(booking.status)}`}
              className="h-auto w-full justify-between gap-3 rounded-xl border border-border-subtle bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-ink">
                    {booking.service.timeRange || booking.service.scheduledTime.split(" ")[0]}
                  </span>
                  <Badge variant="outline" className="text-xs font-medium">
                    {booking.code}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs font-bold">
                  {booking.pet.name} · {booking.pet.breed}
                </p>
                <p className="truncate text-xs text-muted-text">{booking.service.title}</p>
                <span className="mt-1 inline-flex rounded-md border border-current/20 bg-surface/70 px-1.5 py-0.5 text-xs font-semibold">
                  {getStatusLabel(booking.status)}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-bold text-xs tabular-nums text-primary">
                  {booking.financial.finalAmount.toLocaleString("vi-VN")}₫
                </span>
                <p className="mt-0.5 text-xs text-muted-text">{booking.customer.name}</p>
              </div>
            </Button>
          ))}
        </div>

        {date && (
          <div className="flex justify-end border-t border-border-subtle p-4">
            {cannotBook && (
              <p className="mr-auto self-center text-xs font-medium text-amber-800">
                {isClosedDate
                  ? "Cơ sở nghỉ trong ngày này, không thể đặt lịch."
                  : "Ngày đã qua, không thể đặt lịch."}
              </p>
            )}
            <Button
              type="button"
              disabled={cannotBook}
              size="lg"
              className="gap-2 bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:cursor-not-allowed"
              aria-label={
                isClosedDate
                  ? "Không thể đặt lịch vì cơ sở nghỉ"
                  : isPastDate
                    ? "Không thể đặt lịch cho ngày đã qua"
                    : `Đặt lịch ngày ${date}`
              }
              onClick={() => {
                onClose();
                onNewBooking(date);
              }}
            >
              <Plus aria-hidden="true" className="size-4" />
              Đặt lịch ngày này
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
