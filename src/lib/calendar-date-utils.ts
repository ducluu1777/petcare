const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const vietnamDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VIETNAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function vietnamDateKey(date = new Date()): string {
  const dateParts = Object.fromEntries(
    vietnamDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function calendarDateFromKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new RangeError(`Invalid calendar date: ${dateKey}`);

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (calendarDateKey(date) !== dateKey) {
    throw new RangeError(`Invalid calendar date: ${dateKey}`);
  }

  return date;
}

export function calendarDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function addCalendarDays(date: Date, amount: number): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + amount,
    12,
  ));
}

export function addCalendarMonths(date: Date, amount: number): Date {
  const targetMonth = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + amount,
    1,
    12,
  ));
  const lastTargetDay = new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth() + 1,
    0,
    12,
  )).getUTCDate();

  return new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth(),
    Math.min(date.getUTCDate(), lastTargetDay),
    12,
  ));
}

export function calendarMonthLength(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12)).getUTCDate();
}

export function calendarMondayOffset(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}
