"use client";

import * as React from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import type { BookingRecord } from "@/lib/admin-booking-record";
import { CalendarLoadingState } from "@/components/admin/bookings/calendar-loading-state";
import {
  CalendarScheduleToolbar,
  type CalendarMode,
} from "@/components/admin/bookings/calendar-schedule-toolbar";
import { CalendarDayBookingsDialog } from "@/components/admin/bookings/calendar-day-bookings-dialog";
import { CalendarDayView } from "@/components/admin/bookings/calendar-day-view";
import { CalendarWeekView } from "@/components/admin/bookings/calendar-week-view";
import { CalendarMonthView } from "@/components/admin/bookings/calendar-month-view";
import { getCalendarStatusPresentation } from "@/components/admin/bookings/calendar-status-presentation";
import {
  buildCalendarMonthDays,
  buildCalendarWeekDays,
  formatCalendarDate,
  getBookingsByDate,
  getCalendarDateRangeLabel,
  getCalendarVisibleRange,
  splitCalendarDayBookings,
} from "@/components/admin/bookings/calendar-schedule-model";
import {
  addCalendarDays,
  addCalendarMonths,
  calendarDateFromKey,
  calendarDateKey,
  vietnamDateKey,
} from "@/lib/calendar-date-utils";

interface CalendarScheduleViewProps {
  bookings: BookingRecord[];
  closedDates?: string[];
  isLoading?: boolean;
  hasError?: boolean;
  onOpenDetail: (booking: BookingRecord) => void;
  onNewBooking: (defaultDate?: string) => void;
  onRetry?: () => unknown;
  onVisibleRangeChange?: (range: { from: string; to: string }) => void;
}

export function CalendarScheduleView({
  bookings,
  closedDates = [],
  isLoading = false,
  hasError = false,
  onOpenDetail,
  onNewBooking,
  onRetry,
  onVisibleRangeChange,
}: CalendarScheduleViewProps) {
  // Chế độ xem lịch.
  const [calendarMode, setCalendarMode] = React.useState<CalendarMode>("MONTH");

  // Ngày đang chọn (mặc định là hôm nay theo giờ Việt Nam).
  const [now, setNow] = React.useState(() => new Date());
  const todayStr = vietnamDateKey(now);
  const [selectedDate, setSelectedDate] = React.useState<Date>(
    () => calendarDateFromKey(vietnamDateKey()),
  );
  const previousToday = React.useRef(todayStr);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [showClosedDates, setShowClosedDates] = React.useState(true);
  const [selectedDayForModal, setSelectedDayForModal] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const priorToday = previousToday.current;
    if (priorToday !== todayStr) {
      setSelectedDate((currentDate) =>
        calendarDateKey(currentDate) === priorToday
          ? calendarDateFromKey(todayStr)
          : currentDate,
      );
      previousToday.current = todayStr;
    }
  }, [todayStr]);

  // Điều hướng theo ngày vận hành của PetCare tại Việt Nam.
  const handlePrev = () => {
    if (calendarMode === "MONTH") {
      setSelectedDate((date) => addCalendarMonths(date, -1));
    } else if (calendarMode === "WEEK") {
      setSelectedDate((date) => addCalendarDays(date, -7));
    } else {
      setSelectedDate((date) => addCalendarDays(date, -1));
    }
  };

  const handleNext = () => {
    if (calendarMode === "MONTH") {
      setSelectedDate((date) => addCalendarMonths(date, 1));
    } else if (calendarMode === "WEEK") {
      setSelectedDate((date) => addCalendarDays(date, 7));
    } else {
      setSelectedDate((date) => addCalendarDays(date, 1));
    }
  };

  const handleToday = () => {
    setSelectedDate(calendarDateFromKey(todayStr));
  };

  const closedDateSet = React.useMemo(() => new Set(closedDates), [closedDates]);
  const selectedDateStr = calendarDateKey(selectedDate);
  const selectedDateFormatted = formatCalendarDate(selectedDate);
  const toolbarBookingDate = calendarMode === "MONTH" ? todayStr : selectedDateStr;
  const toolbarBookingDateFormatted = calendarMode === "MONTH"
    ? formatCalendarDate(calendarDateFromKey(todayStr))
    : selectedDateFormatted;
  const toolbarBookingDateIsClosed = closedDateSet.has(toolbarBookingDate);

  const bookingsByDate = React.useMemo(() => {
    return getBookingsByDate(bookings, statusFilter, todayStr);
  }, [bookings, statusFilter, todayStr]);

  const monthDays = React.useMemo(() => {
    return buildCalendarMonthDays(selectedDate, todayStr, closedDateSet);
  }, [closedDateSet, selectedDate, todayStr]);

  const headerDateRangeText = React.useMemo(() => {
    return getCalendarDateRangeLabel(calendarMode, selectedDate);
  }, [selectedDate, calendarMode]);

  const weekDays = React.useMemo(() => {
    return buildCalendarWeekDays(selectedDate, todayStr);
  }, [selectedDate, todayStr]);

  const visibleRange = React.useMemo(() => {
    return getCalendarVisibleRange(
      calendarMode,
      selectedDate,
      monthDays,
      weekDays,
    );
  }, [calendarMode, monthDays, selectedDate, weekDays]);

  React.useEffect(() => {
    onVisibleRangeChange?.(visibleRange);
  }, [onVisibleRangeChange, visibleRange]);

  // Dữ liệu cho chế độ Ngày (DAY)
  const dayBookings = React.useMemo(() => {
    return bookingsByDate.get(selectedDateStr) ?? [];
  }, [bookingsByDate, selectedDateStr]);
  const { arrivalBookings, inServiceBookings, completedBookings } =
    React.useMemo(() => splitCalendarDayBookings(dayBookings), [dayBookings]);
  const selectedDayDate = selectedDayForModal ? calendarDateFromKey(selectedDayForModal) : null;
  const selectedDayLabel = selectedDayDate ? formatCalendarDate(selectedDayDate) : "";
  const selectedDayBookings = selectedDayForModal ? bookingsByDate.get(selectedDayForModal) ?? [] : [];


  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <CalendarScheduleToolbar
        mode={calendarMode}
        onModeChange={setCalendarMode}
        onPrevious={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        dateRangeLabel={headerDateRangeText}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        hasClosedDates={closedDates.length > 0}
        showClosedDates={showClosedDates}
        onShowClosedDatesChange={setShowClosedDates}
        bookingDate={toolbarBookingDate}
        bookingDateLabel={toolbarBookingDateFormatted}
        isBookingDateClosed={toolbarBookingDateIsClosed}
        onNewBooking={onNewBooking}
      />

      {isLoading ? (
        <CalendarLoadingState mode={calendarMode} />
      ) : hasError ? (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border-subtle bg-surface">
          <AdminDataState
            variant="error"
            title="Không tải được lịch trong khoảng ngày này."
            description="Kiểm tra kết nối rồi thử tải lại lịch."
            onRetry={onRetry}
            className="min-h-[360px]"
          />
        </div>
      ) : (
        <>
          {calendarMode === "MONTH" && (
            <CalendarMonthView
              monthDays={monthDays}
              bookingsByDate={bookingsByDate}
              todayStr={todayStr}
              closedDateSet={closedDateSet}
              showClosedDates={showClosedDates}
              getStatusPresentation={getCalendarStatusPresentation}
              onOpenDay={setSelectedDayForModal}
              onNewBooking={onNewBooking}
              onOpenDetail={onOpenDetail}
            />
          )}

          {calendarMode === "WEEK" && (
            <CalendarWeekView
              weekDays={weekDays}
              bookingsByDate={bookingsByDate}
              closedDateSet={closedDateSet}
              showClosedDates={showClosedDates}
              getStatusPresentation={getCalendarStatusPresentation}
              onOpenDetail={onOpenDetail}
            />
          )}

          {calendarMode === "DAY" && (
            <CalendarDayView
              selectedDateFormatted={selectedDateFormatted}
              dayBookings={dayBookings}
              arrivalBookings={arrivalBookings}
              inServiceBookings={inServiceBookings}
              completedBookings={completedBookings}
              getStatusPresentation={getCalendarStatusPresentation}
              onOpenDetail={onOpenDetail}
            />
          )}
        </>
      )}

      <CalendarDayBookingsDialog
        date={selectedDayForModal}
        dateLabel={selectedDayLabel}
        bookings={selectedDayBookings}
        isClosedDate={selectedDayForModal ? closedDateSet.has(selectedDayForModal) : false}
        showClosedDates={showClosedDates}
        todayStr={todayStr}
        getStatusLabel={(status) => getCalendarStatusPresentation(status).label}
        onClose={() => setSelectedDayForModal(null)}
        onOpenDetail={onOpenDetail}
        onNewBooking={(date) => onNewBooking(date)}
      />
    </div>
  );
}
