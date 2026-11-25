import { describe, expect, it } from "bun:test";
import {
  addCalendarDays,
  addCalendarMonths,
  calendarDateFromKey,
  calendarDateKey,
  vietnamDateKey,
} from "./calendar-date-utils";

describe("calendar date utilities", () => {
  it("uses the PetCare Vietnam date when the browser time is near midnight", () => {
    expect(vietnamDateKey(new Date("2026-10-15T17:05:00.000Z"))).toBe("2026-10-16");
  });

  it("keeps date-only values stable when converted to and from a calendar date", () => {
    const date = calendarDateFromKey("2026-10-16");

    expect(calendarDateKey(date)).toBe("2026-10-16");
  });

  it("moves across month boundaries without depending on the device timezone", () => {
    const nextDay = addCalendarDays(calendarDateFromKey("2026-10-31"), 1);

    expect(calendarDateKey(nextDay)).toBe("2026-11-01");
  });

  it("keeps month navigation within the target month", () => {
    const nextMonth = addCalendarMonths(calendarDateFromKey("2026-01-31"), 1);

    expect(calendarDateKey(nextMonth)).toBe("2026-02-28");
  });
});
