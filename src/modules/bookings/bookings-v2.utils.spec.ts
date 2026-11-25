import { BookingSource, BookingStatusV2 } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  checkPeakEventPoints,
  formatVnDate,
  formatVnTime,
  getEffectiveEndAt,
  isHalfOpenOverlapping,
  parseVnTime,
} from './bookings-v2.utils.js';

describe('Bookings V2 Utilities & Peak Algorithm', () => {
  it('should format and parse Vietnam timezone correctly (+07:00)', () => {
    const vnDateStr = '2026-10-13';
    const timeStr = '08:30';
    const date = parseVnTime(vnDateStr, timeStr);

    expect(formatVnDate(date)).toBe('2026-10-13');
    expect(formatVnTime(date)).toBe('08:30');
    // 08:30 in UTC+7 is 01:30 in UTC
    expect(date.toISOString()).toBe('2026-10-13T01:30:00.000Z');
  });

  describe('isHalfOpenOverlapping [start, end)', () => {
    it('should NOT consider adjacent back-to-back bookings as overlapping', () => {
      const aStart = new Date('2026-10-13T09:00:00+07:00');
      const aEnd = new Date('2026-10-13T10:00:00+07:00');
      const bStart = new Date('2026-10-13T10:00:00+07:00');
      const bEnd = new Date('2026-10-13T11:00:00+07:00');

      expect(isHalfOpenOverlapping(aStart, aEnd, bStart, bEnd)).toBe(false);
      expect(isHalfOpenOverlapping(bStart, bEnd, aStart, aEnd)).toBe(false);
    });

    it('should detect 1-minute overlap', () => {
      const aStart = new Date('2026-10-13T09:00:00+07:00');
      const aEnd = new Date('2026-10-13T10:01:00+07:00');
      const bStart = new Date('2026-10-13T10:00:00+07:00');
      const bEnd = new Date('2026-10-13T11:00:00+07:00');

      expect(isHalfOpenOverlapping(aStart, aEnd, bStart, bEnd)).toBe(true);
    });
  });

  describe('getEffectiveEndAt', () => {
    it('should extend effective end time for overdue IN_SERVICE booking', () => {
      const endAt = new Date('2026-10-13T10:00:00+07:00');
      const now = new Date('2026-10-13T10:20:00+07:00');

      const effective = getEffectiveEndAt(
        { statusV2: BookingStatusV2.IN_SERVICE, endAt },
        now,
      );
      expect(effective.getTime()).toBe(now.getTime());
    });

    it('should NOT extend effective end time if booking is BOOKED or not overdue', () => {
      const endAt = new Date('2026-10-13T10:00:00+07:00');
      const now = new Date('2026-10-13T10:20:00+07:00');

      const bookedResult = getEffectiveEndAt(
        { statusV2: BookingStatusV2.BOOKED, endAt },
        now,
      );
      expect(bookedResult.getTime()).toBe(endAt.getTime());

      const futureNow = new Date('2026-10-13T09:30:00+07:00');
      const inServiceNotOverdue = getEffectiveEndAt(
        { statusV2: BookingStatusV2.IN_SERVICE, endAt },
        futureNow,
      );
      expect(inServiceNotOverdue.getTime()).toBe(endAt.getTime());
    });
  });

  describe('checkPeakEventPoints', () => {
    const now = new Date('2026-10-13T08:00:00+07:00');

    it('should allow booking when concurrent count < capacity', () => {
      const newStart = new Date('2026-10-13T09:00:00+07:00');
      const newEnd = new Date('2026-10-13T10:30:00+07:00');

      const activeBookings = [
        {
          startAt: new Date('2026-10-13T09:00:00+07:00'),
          endAt: new Date('2026-10-13T10:00:00+07:00'),
          statusV2: BookingStatusV2.BOOKED,
          source: BookingSource.WEB,
        },
        {
          startAt: new Date('2026-10-13T09:30:00+07:00'),
          endAt: new Date('2026-10-13T11:00:00+07:00'),
          statusV2: BookingStatusV2.BOOKED,
          source: BookingSource.WEB,
        },
      ];

      // capacity = 3 -> 2 existing + 1 new = 3 -> allowed
      const result = checkPeakEventPoints(
        newStart,
        newEnd,
        BookingSource.WEB,
        3,
        null,
        activeBookings,
        now,
      );
      expect(result.ok).toBe(true);
    });

    it('should reject booking when concurrent count exceeds capacity at peak point', () => {
      const newStart = new Date('2026-10-13T09:00:00+07:00');
      const newEnd = new Date('2026-10-13T10:30:00+07:00');

      // 3 active bookings overlapping at 09:30
      const activeBookings = [
        {
          startAt: new Date('2026-10-13T09:00:00+07:00'),
          endAt: new Date('2026-10-13T10:00:00+07:00'),
          statusV2: BookingStatusV2.BOOKED,
          source: BookingSource.WEB,
        },
        {
          startAt: new Date('2026-10-13T09:15:00+07:00'),
          endAt: new Date('2026-10-13T10:15:00+07:00'),
          statusV2: BookingStatusV2.BOOKED,
          source: BookingSource.WEB,
        },
        {
          startAt: new Date('2026-10-13T09:30:00+07:00'),
          endAt: new Date('2026-10-13T10:45:00+07:00'),
          statusV2: BookingStatusV2.BOOKED,
          source: BookingSource.WEB,
        },
      ];

      const result = checkPeakEventPoints(
        newStart,
        newEnd,
        BookingSource.WEB,
        3,
        null,
        activeBookings,
        now,
      );
      expect(result.ok).toBe(false);
      expect(result.maxCapacity).toBe(3);
    });

    it('should enforce webCapacity separately from total capacity', () => {
      const newStart = new Date('2026-10-13T09:00:00+07:00');
      const newEnd = new Date('2026-10-13T10:00:00+07:00');

      // 2 web bookings running
      const activeBookings = [
        {
          startAt: new Date('2026-10-13T09:00:00+07:00'),
          endAt: new Date('2026-10-13T10:00:00+07:00'),
          statusV2: BookingStatusV2.BOOKED,
          source: BookingSource.WEB,
        },
        {
          startAt: new Date('2026-10-13T09:00:00+07:00'),
          endAt: new Date('2026-10-13T10:00:00+07:00'),
          statusV2: BookingStatusV2.BOOKED,
          source: BookingSource.WEB,
        },
      ];

      // Total capacity 3, but webCapacity 2:
      // Web booking should be rejected because web is at 2/2
      const webResult = checkPeakEventPoints(
        newStart,
        newEnd,
        BookingSource.WEB,
        3,
        2,
        activeBookings,
        now,
      );
      expect(webResult.ok).toBe(false);
      expect(webResult.isWebLimit).toBe(true);

      // But receptionist booking should be allowed (total is 2/3)
      const recResult = checkPeakEventPoints(
        newStart,
        newEnd,
        BookingSource.RECEPTIONIST,
        3,
        2,
        activeBookings,
        now,
      );
      expect(recResult.ok).toBe(true);
    });
  });
});
