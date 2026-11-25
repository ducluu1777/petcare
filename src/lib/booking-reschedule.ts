const CUSTOMER_SELF_SERVICE_HOURS = 4;
const PETCARE_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function canCustomerSelfServeBooking(
  startAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!startAt) return false;

  const bookingTime = Date.parse(startAt);
  if (!Number.isFinite(bookingTime)) return false;

  return bookingTime - now >= CUSTOMER_SELF_SERVICE_HOURS * 60 * 60 * 1000;
}

export function formatPetCareDateValue(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PETCARE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatPetCareTimeValue(instant: string | Date): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PETCARE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function buildPetCareStartAt(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error("Ngày hoặc giờ hẹn không hợp lệ.");
  }

  const startAt = new Date(`${date}T${time}:00+07:00`);
  if (formatPetCareDateValue(startAt) !== date || formatPetCareTimeValue(startAt) !== time) {
    throw new Error("Ngày hoặc giờ hẹn không hợp lệ.");
  }

  return startAt.toISOString();
}
