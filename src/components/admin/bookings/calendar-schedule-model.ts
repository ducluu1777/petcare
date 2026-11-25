import type { BookingRecord } from "@/lib/admin-booking-record";
import {
  addCalendarDays,
  calendarDateFromKey,
  calendarDateKey,
  calendarMondayOffset,
  calendarMonthLength,
} from "@/lib/calendar-date-utils";
import type { CalendarMonthDay } from "./calendar-month-day-cell";
import type { CalendarMode } from "./calendar-schedule-toolbar";

export interface CalendarWeekDay {
  title: string;
  dateString: string;
  isToday: boolean;
}

export interface CalendarVisibleRange {
  from: string;
  to: string;
}

export interface CalendarDayBookingGroups {
  arrivalBookings: BookingRecord[];
  inServiceBookings: BookingRecord[];
  completedBookings: BookingRecord[];
}

export function formatCalendarDate(date: Date) {
  return [
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    date.getUTCFullYear(),
  ].join("/");
}

function getStartMinute(scheduledTime: string) {
  const match = /\b(\d{1,2}):(\d{2})\b/.exec(scheduledTime);
  return match
    ? Number(match[1]) * 60 + Number(match[2])
    : Number.MAX_SAFE_INTEGER;
}

export function getBookingsByDate(
  bookings: BookingRecord[],
  statusFilter: string,
  todayStr: string,
) {
  const groupedBookings = new Map<string, BookingRecord[]>();

  for (const booking of bookings) {
    if (statusFilter !== "ALL" && booking.status !== statusFilter) continue;
    const dateKey = booking.date || todayStr;
    const dayBookings = groupedBookings.get(dateKey) ?? [];
    dayBookings.push(booking);
    groupedBookings.set(dateKey, dayBookings);
  }

  for (const dayBookings of groupedBookings.values()) {
    dayBookings.sort((a, b) =>
      getStartMinute(a.service.scheduledTime) -
        getStartMinute(b.service.scheduledTime) ||
      a.code.localeCompare(b.code),
    );
  }

  return groupedBookings;
}

export function buildCalendarMonthDays(
  selectedDate: Date,
  todayStr: string,
  closedDateSet: ReadonlySet<string>,
): CalendarMonthDay[] {
  const year = selectedDate.getUTCFullYear();
  const month = selectedDate.getUTCMonth();
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1, 12));
  const firstWeekOffset = calendarMondayOffset(firstDayOfMonth);
  const dayCount = calendarMonthLength(selectedDate);
  const gridDayCount = Math.ceil((firstWeekOffset + dayCount) / 7) * 7;

  return Array.from({ length: gridDayCount }, (_, index) => {
    const date = addCalendarDays(firstDayOfMonth, index - firstWeekOffset);
    const dateString = calendarDateKey(date);

    return {
      dateString,
      dayNumber: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === month,
      isToday: dateString === todayStr,
      closedDate: closedDateSet.has(dateString) ? "Cơ sở nghỉ" : undefined,
    };
  });
}

export function getCalendarDateRangeLabel(
  mode: CalendarMode,
  selectedDate: Date,
) {
  if (mode === "MONTH") {
    const year = selectedDate.getUTCFullYear();
    const month = selectedDate.getUTCMonth();
    const lastDay = calendarMonthLength(selectedDate);
    const monthLabel = String(month + 1).padStart(2, "0");
    return [
      "01/",
      monthLabel,
      "/",
      year,
      " - ",
      lastDay,
      "/",
      monthLabel,
      "/",
      year,
    ].join("");
  }

  if (mode === "WEEK") {
    const monday = addCalendarDays(
      selectedDate,
      -calendarMondayOffset(selectedDate),
    );
    const sunday = addCalendarDays(monday, 6);
    const formatDayAndMonth = (date: Date) =>
      [
        String(date.getUTCDate()).padStart(2, "0"),
        "/",
        String(date.getUTCMonth() + 1).padStart(2, "0"),
      ].join("");
    const startYear =
      monday.getUTCFullYear() !== sunday.getUTCFullYear()
        ? "/" + monday.getUTCFullYear()
        : "";
    const startDate = formatDayAndMonth(monday) + startYear;
    return (
      startDate +
      " - " +
      formatDayAndMonth(sunday) +
      "/" +
      sunday.getUTCFullYear()
    );
  }

  return "Ngày " + formatCalendarDate(selectedDate);
}

export function buildCalendarWeekDays(
  selectedDate: Date,
  todayStr: string,
): CalendarWeekDay[] {
  const monday = addCalendarDays(
    selectedDate,
    -calendarMondayOffset(selectedDate),
  );
  const dayNames = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];

  return Array.from({ length: 7 }, (_, index) => {
    const date = addCalendarDays(monday, index);
    const dateString = calendarDateKey(date);
    const dateLabel = [
      String(date.getUTCDate()).padStart(2, "0"),
      "/",
      String(date.getUTCMonth() + 1).padStart(2, "0"),
    ].join("");

    return {
      title: dayNames[index] + " (" + dateLabel + ")",
      dateString,
      isToday: dateString === todayStr,
    };
  });
}

export function getCalendarVisibleRange(
  mode: CalendarMode,
  selectedDate: Date,
  monthDays: CalendarMonthDay[],
  weekDays: CalendarWeekDay[],
): CalendarVisibleRange {
  let from: string;
  let lastDate: string;

  if (mode === "MONTH") {
    from = monthDays[0].dateString;
    lastDate = monthDays[monthDays.length - 1].dateString;
  } else if (mode === "WEEK") {
    from = weekDays[0].dateString;
    lastDate = weekDays[6].dateString;
  } else {
    from = calendarDateKey(selectedDate);
    lastDate = from;
  }

  return {
    from,
    to: calendarDateKey(addCalendarDays(calendarDateFromKey(lastDate), 1)),
  };
}

export function splitCalendarDayBookings(
  dayBookings: BookingRecord[],
): CalendarDayBookingGroups {
  return {
    arrivalBookings: dayBookings.filter((booking) =>
      ["WAITING_CHECKIN", "ARRIVED"].includes(booking.status),
    ),
    inServiceBookings: dayBookings.filter(
      (booking) => booking.status === "IN_PROGRESS",
    ),
    completedBookings: dayBookings.filter((booking) =>
      ["READY_FOR_PICKUP", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(
        booking.status,
      ),
    ),
  };
}
