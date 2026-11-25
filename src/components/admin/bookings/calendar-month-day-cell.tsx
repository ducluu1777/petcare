import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingRecord } from "@/lib/admin-booking-record";

export interface CalendarMonthDay {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  closedDate?: string;
}

export interface CalendarStatusPresentation {
  bg: string;
  dot: string;
  label: string;
}

interface CalendarMonthDayCellProps {
  day: CalendarMonthDay;
  bookings: BookingRecord[];
  todayStr: string;
  isClosedDate: boolean;
  showClosedDates: boolean;
  getStatusPresentation: (status: BookingRecord["status"]) => CalendarStatusPresentation;
  onOpenDay: (date: string) => void;
  onNewBooking: (date: string) => void;
  onOpenDetail: (booking: BookingRecord) => void;
}

export function CalendarMonthDayCell({
  day,
  bookings,
  todayStr,
  isClosedDate,
  showClosedDates,
  getStatusPresentation,
  onOpenDay,
  onNewBooking,
  onOpenDetail,
}: CalendarMonthDayCellProps) {
  return (
    <div
      className={`h-full min-h-0 p-1.5 flex flex-col justify-between transition-colors relative group overflow-hidden ${
        day.isCurrentMonth ? "bg-surface" : "bg-slate-50/40 text-slate-400"
      } ${day.isToday ? "bg-teal-50/30 ring-1 ring-inset ring-teal-300" : ""}`}
    >
      <div className="flex items-center justify-between gap-1 mb-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenDay(day.dateString)}
            aria-current={day.isToday ? "date" : undefined}
            aria-label={`Xem lịch ngày ${day.dateString}${day.closedDate ? ", cơ sở nghỉ" : ""}`}
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              day.isToday
                ? "bg-primary text-primary-foreground shadow-xs"
                : day.isCurrentMonth
                  ? "text-ink hover:bg-slate-100"
                  : "text-slate-300 hover:bg-slate-100/70"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`}
          >
            {day.dayNumber}
          </Button>

          {showClosedDates && day.closedDate && (
            <span className="hidden sm:inline-flex text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded whitespace-nowrap truncate max-w-[80px]">
              {day.closedDate}
            </span>
          )}
          {showClosedDates && day.closedDate && <span aria-hidden="true" className="sm:hidden size-1.5 rounded-full bg-amber-500" />}
        </div>

        <Button
          type="button"
          disabled={day.dateString < todayStr || isClosedDate}
          onClick={() => onNewBooking(day.dateString)}
          aria-label={
            isClosedDate
              ? `Không thể tạo lịch ngày ${day.dateString} vì cơ sở nghỉ`
              : day.dateString < todayStr
                ? `Không thể tạo lịch ngày ${day.dateString} vì ngày đã qua`
                : `Tạo lịch ngày ${day.dateString}`
          }
          variant="ghost"
          size="icon"
          className="size-10 hidden opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 text-slate-500 hover:bg-slate-200 hover:text-ink focus-visible:ring-primary lg:inline-flex disabled:cursor-not-allowed disabled:opacity-30"
          title={
            isClosedDate
              ? "Cơ sở nghỉ trong ngày này"
              : day.dateString < todayStr
                ? "Không thể tạo lịch cho ngày đã qua"
                : `Tạo lịch hẹn mới vào ngày ${day.dateString}`
          }
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div
        data-lenis-prevent
        className="hidden sm:block space-y-1 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-0.5 scrollbar-thin"
      >
        {bookings.map((booking) => {
          const status = getStatusPresentation(booking.status);

          return (
            <Button
              key={booking.id}
              type="button"
              variant="ghost"
              onClick={() => onOpenDetail(booking)}
              aria-label={`Mở lịch ${booking.code} của ${booking.pet.name}, ${booking.service.scheduledTime.split(" ")[0]}, trạng thái ${status.label}`}
              className={`h-auto w-full justify-start p-1 text-left rounded-md border transition-all shadow-2xs hover:bg-transparent hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${status.bg}`}
              title={`${booking.code} - ${booking.pet.name} (${booking.pet.breed}) | ${booking.service.title}`}
            >
              <div className="flex items-center justify-between gap-1 leading-none">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                  <span>{booking.service.scheduledTime.split(" ")[0]}</span>
                </span>
                <span className="text-xs font-semibold opacity-75 tabular-nums">
                  {booking.code}
                </span>
              </div>

              <div className="text-xs font-bold truncate mt-0.5 text-ink leading-tight">
                {booking.pet.name}
              </div>

              <div className="text-xs text-muted-text truncate leading-tight">
                {booking.service.title}
              </div>
            </Button>
          );
        })}
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpenDay(day.dateString)}
        aria-label={bookings.length > 0 ? `Xem ${bookings.length} lịch ngày ${day.dateString}` : `Xem lịch ngày ${day.dateString}`}
        className="h-auto sm:hidden flex-1 min-h-0 rounded-md text-xs font-semibold text-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {bookings.length > 0 ? `${bookings.length} lịch` : "Xem lịch"}
      </Button>

      {bookings.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenDay(day.dateString)}
          className="h-auto hidden sm:flex w-full justify-between pt-1 text-sm text-muted-text items-center border-t border-border-subtle/50 mt-0.5 hover:bg-transparent hover:text-primary transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Xem toàn bộ ${bookings.length} lịch ngày ${day.dateString}`}
          title="Bấm để xem danh sách toàn bộ ca hẹn của ngày"
        >
          <span className="font-semibold text-primary flex items-center gap-0.5">
            <span>{bookings.length} ca</span>
            {bookings.length > 2 && <ChevronDown aria-hidden="true" className="w-2.5 h-2.5 inline" />}
          </span>
          <span className="font-bold text-slate-700 tabular-nums">
            {bookings.reduce((sum, booking) => sum + booking.financial.finalAmount, 0).toLocaleString("vi-VN")}
            ₫
          </span>
        </Button>
      )}
    </div>
  );
}
