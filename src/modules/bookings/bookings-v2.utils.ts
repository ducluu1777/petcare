import { BookingSource, BookingStatusV2 } from '@prisma/client';

export interface BookingInterval {
  id?: string;
  startAt: Date;
  endAt: Date;
  statusV2: BookingStatusV2 | null;
  source: BookingSource;
}

/** Format giờ theo múi giờ chuẩn Asia/Ho_Chi_Minh (HH:mm) */
export function formatVnTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Khung giao ca không nhận giờ bắt đầu booking mới. */
export function isShiftHandoverStartTime(time: string | Date): boolean {
  const localTime = typeof time === 'string' ? time.slice(0, 5) : formatVnTime(time);
  return localTime >= '14:00' && localTime < '15:00';
}

export const SHIFT_HANDOVER_START_ERROR =
  'Không nhận lịch bắt đầu mới từ 14:00 đến trước 15:00 để bàn giao ca. Vui lòng chọn giờ khác.';

/** Format ngày theo múi giờ chuẩn Asia/Ho_Chi_Minh (YYYY-MM-DD) */
export function formatVnDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

/** Ghép chuỗi ngày YYYY-MM-DD và giờ HH:mm thành Date chuẩn +07:00 */
export function parseVnTime(vnDateStr: string, timeStr: string): Date {
  return new Date(`${vnDateStr}T${timeStr}:00+07:00`);
}

/**
 * Tính mốc kết thúc hiệu dụng của một ca làm việc.
 * Với ca IN_SERVICE bị quá giờ dự kiến, lấy max(endAt, now) để không bị coi là trạm trống.
 */
export function getEffectiveEndAt(
  booking: { statusV2: BookingStatusV2 | null; endAt: Date | null },
  now: Date,
): Date {
  if (!booking.endAt) return now;
  if (booking.statusV2 === BookingStatusV2.IN_SERVICE && booking.endAt < now) {
    return now;
  }
  return booking.endAt;
}

/**
 * Kiểm tra 2 khoảng thời gian nửa mở [startA, endA) và [startB, endB) có chồng lấn không.
 * Điều kiện toán học nghiêm ngặt: (startA < endB) && (endA > startB)
 */
export function isHalfOpenOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

export interface CapacityCheckResult {
  ok: boolean;
  conflictTime?: Date;
  concurrentTotal?: number;
  concurrentWeb?: number;
  maxCapacity?: number;
  isWebLimit?: boolean;
}

export interface StartSlotBooking {
  startAt: Date;
  source: BookingSource;
}

export interface StartSlotCapacityResult {
  ok: boolean;
  conflictTime: Date;
  /** Existing booking count in the slot, before adding the candidate booking. */
  concurrentTotal: number;
  /** Existing WEB booking count in the slot, before adding the candidate booking. */
  concurrentWeb: number;
  maxCapacity: number;
  isWebLimit: boolean;
}

export function roundUpToNextStartSlot(startAt: Date, slotStepMin: number): Date {
  const vnDate = formatVnDate(startAt);
  const [hour, minute] = formatVnTime(startAt).split(':').map(Number);
  const minutesFromMidnight = hour * 60 + minute;
  const roundedMinute = Math.ceil(minutesFromMidnight / slotStepMin) * slotStepMin;
  return new Date(parseVnTime(vnDate, '00:00').getTime() + roundedMinute * 60000);
}

/** Capacity counts bookings that start in the same configured slot, independent of service length. */
export function checkStartSlotCapacity(
  slotStartAt: Date,
  slotStepMin: number,
  source: BookingSource,
  capacity: number,
  webCapacity: number | null,
  bookings: StartSlotBooking[],
): StartSlotCapacityResult {
  const slotEndAt = new Date(slotStartAt.getTime() + slotStepMin * 60000);
  const inSlot = bookings.filter((booking) => {
    const bookingSlotStart = booking.source === BookingSource.WALK_IN
      ? roundUpToNextStartSlot(booking.startAt, slotStepMin)
      : booking.startAt;
    return bookingSlotStart >= slotStartAt && bookingSlotStart < slotEndAt;
  });
  const concurrentTotal = inSlot.length;
  const concurrentWeb = inSlot.filter((booking) => booking.source === BookingSource.WEB).length;

  if (concurrentTotal + 1 > capacity) {
    return {
      ok: false,
      conflictTime: slotStartAt,
      concurrentTotal,
      concurrentWeb,
      maxCapacity: capacity,
      isWebLimit: false,
    };
  }

  if (source === BookingSource.WEB && webCapacity != null && concurrentWeb + 1 > webCapacity) {
    return {
      ok: false,
      conflictTime: slotStartAt,
      concurrentTotal,
      concurrentWeb,
      maxCapacity: webCapacity,
      isWebLimit: true,
    };
  }

  return {
    ok: true,
    conflictTime: slotStartAt,
    concurrentTotal,
    concurrentWeb,
    maxCapacity: capacity,
    isWebLimit: false,
  };
}

/**
 * Thuật toán Peak Event Points:
 * Số lượng ca đồng thời chỉ có thể tăng lên tại thời điểm có một ca BẮT ĐẦU.
 * Kiểm tra tập điểm T_check = { newStart } U { b.start | b in overlaps && b.start >= newStart }
 */
export function checkPeakEventPoints(
  newStartAt: Date,
  newEndAt: Date,
  source: BookingSource,
  capacity: number,
  webCapacity: number | null,
  activeBookings: BookingInterval[],
  now: Date,
): CapacityCheckResult {
  // Lọc các ca thực sự chồng lấn với effectiveEnd
  const validOverlaps = activeBookings.filter((b) => {
    const effectiveEnd = getEffectiveEndAt(b, now);
    return isHalfOpenOverlapping(newStartAt, newEndAt, b.startAt, effectiveEnd);
  });

  // Tập hợp các điểm sự kiện cần kiểm tra đỉnh
  const checkPointTimes = [
    newStartAt.getTime(),
    ...validOverlaps
      .map((b) => b.startAt.getTime())
      .filter((t) => t >= newStartAt.getTime() && t < newEndAt.getTime()),
  ];

  let peakConcurrentTotal = 0;
  let peakConcurrentWeb = 0;

  for (const t of checkPointTimes) {
    const concurrentTotal = validOverlaps.filter((b) => {
      const effectiveEnd = getEffectiveEndAt(b, now);
      return b.startAt.getTime() <= t && effectiveEnd.getTime() > t;
    }).length;
    peakConcurrentTotal = Math.max(peakConcurrentTotal, concurrentTotal);

    // Kiểm tra công suất tổng trạm (N)
    if (concurrentTotal + 1 > capacity) {
      return {
        ok: false,
        conflictTime: new Date(t),
        concurrentTotal: concurrentTotal + 1,
        maxCapacity: capacity,
        isWebLimit: false,
      };
    }

    // Kiểm tra công suất riêng cho nguồn Web (nếu có cấu hình webCapacity)
    if (source === BookingSource.WEB && webCapacity !== null && webCapacity !== undefined) {
      const concurrentWeb = validOverlaps.filter((b) => {
        const effectiveEnd = getEffectiveEndAt(b, now);
        return (
          b.source === BookingSource.WEB &&
          b.startAt.getTime() <= t &&
          effectiveEnd.getTime() > t
        );
      }).length;
      peakConcurrentWeb = Math.max(peakConcurrentWeb, concurrentWeb);

      if (concurrentWeb + 1 > webCapacity) {
        return {
          ok: false,
          conflictTime: new Date(t),
          concurrentWeb: concurrentWeb + 1,
          maxCapacity: webCapacity,
          isWebLimit: true,
        };
      }
    }
  }

  return {
    ok: true,
    concurrentTotal: peakConcurrentTotal,
    concurrentWeb: peakConcurrentWeb,
  };
}
