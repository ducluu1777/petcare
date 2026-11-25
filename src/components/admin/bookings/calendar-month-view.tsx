import { CalendarMonthDayCell } from "@/components/admin/bookings/calendar-month-day-cell";
import type {
  CalendarMonthDay,
  CalendarStatusPresentation,
} from "@/components/admin/bookings/calendar-month-day-cell";
import type { BookingRecord } from "@/lib/admin-booking-record";

interface CalendarMonthViewProps {
  monthDays: CalendarMonthDay[];
  bookingsByDate: Map<string, BookingRecord[]>;
  todayStr: string;
  closedDateSet: ReadonlySet<string>;
  showClosedDates: boolean;
  getStatusPresentation: (status: BookingRecord["status"]) => CalendarStatusPresentation;
  onOpenDay: (date: string) => void;
  onNewBooking: (defaultDate?: string) => void;
  onOpenDetail: (booking: BookingRecord) => void;
}

export function CalendarMonthView({
  monthDays,
  bookingsByDate,
  todayStr,
  closedDateSet,
  showClosedDates,
  getStatusPresentation,
  onOpenDay,
  onNewBooking,
  onOpenDetail,
}: CalendarMonthViewProps) {
  return (
    <div className="flex min-w-0 flex-col bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border-subtle bg-slate-100/90 text-center text-xs font-bold text-slate-700 py-1.5 shrink-0 sm:text-xs">
        <div><span className="sm:hidden">T2</span><span className="hidden sm:inline">Thứ 2</span></div>
        <div><span className="sm:hidden">T3</span><span className="hidden sm:inline">Thứ 3</span></div>
        <div><span className="sm:hidden">T4</span><span className="hidden sm:inline">Thứ 4</span></div>
        <div><span className="sm:hidden">T5</span><span className="hidden sm:inline">Thứ 5</span></div>
        <div><span className="sm:hidden">T6</span><span className="hidden sm:inline">Thứ 6</span></div>
        <div><span className="sm:hidden">T7</span><span className="hidden sm:inline">Thứ 7</span></div>
        <div className="text-coral"><span className="sm:hidden">CN</span><span className="hidden sm:inline">Chủ nhật</span></div>
      </div>

      <div
        className="grid auto-rows-[112px] grid-cols-7 divide-x divide-y divide-border-subtle sm:auto-rows-[152px]"
      >
        {monthDays.map((day, index) => (
          <CalendarMonthDayCell
            key={day.dateString + index}
            day={day}
            bookings={bookingsByDate.get(day.dateString) || []}
            todayStr={todayStr}
            isClosedDate={closedDateSet.has(day.dateString)}
            showClosedDates={showClosedDates}
            getStatusPresentation={getStatusPresentation}
            onOpenDay={onOpenDay}
            onNewBooking={onNewBooking}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </div>
  );
}
