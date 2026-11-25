import { BadRequestException } from '@nestjs/common';

const VIETNAM_UTC_OFFSET_HOURS = 7;

function vietnamEndOfDay(year: number, month: number, day: number): Date {
  // Vietnam has a fixed UTC+07:00 offset; 23:59:59.999 local is 16:59:59.999Z.
  return new Date(Date.UTC(year, month - 1, day, 23 - VIETNAM_UTC_OFFSET_HOURS, 59, 59, 999));
}

export function parseVoucherExpiryDate(value: string | Date): Date {
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
      const [, yearText, monthText, dayText] = dateOnly;
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);
      const calendarDate = new Date(Date.UTC(year, month - 1, day));
      if (
        calendarDate.getUTCFullYear() !== year ||
        calendarDate.getUTCMonth() !== month - 1 ||
        calendarDate.getUTCDate() !== day
      ) {
        throw new BadRequestException('Hạn sử dụng voucher không hợp lệ.');
      }
      return vietnamEndOfDay(year, month, day);
    }
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException('Hạn sử dụng voucher không hợp lệ.');
  }
  return normalizeVoucherExpiryDate(parsedDate);
}

export function normalizeVoucherExpiryDate(value: Date | string): Date {
  const expiryDate = new Date(value);
  if (Number.isNaN(expiryDate.getTime())) return expiryDate;

  // Older Admin forms saved a date-only choice as midnight UTC. Treat that legacy
  // value as the selected Vietnam calendar date, valid through its local end.
  const isLegacyUtcMidnight =
    expiryDate.getUTCHours() === 0 &&
    expiryDate.getUTCMinutes() === 0 &&
    expiryDate.getUTCSeconds() === 0 &&
    expiryDate.getUTCMilliseconds() === 0;

  return isLegacyUtcMidnight
    ? vietnamEndOfDay(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth() + 1, expiryDate.getUTCDate())
    : expiryDate;
}

export function isVoucherExpired(expiryDate: Date | string, now = new Date()): boolean {
  const normalizedExpiry = normalizeVoucherExpiryDate(expiryDate);
  return Number.isNaN(normalizedExpiry.getTime()) || normalizedExpiry.getTime() < now.getTime();
}

export function normalizeVoucherExpiry<T extends { expiryDate: Date }>(voucher: T): T {
  return {
    ...voucher,
    expiryDate: normalizeVoucherExpiryDate(voucher.expiryDate),
  };
}
