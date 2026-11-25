import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MailService } from '../../common/mail/mail.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { OrdersService } from '../orders/orders.service.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  /** Release counter-sale QR stock holds shortly after the 15 minute expiry. */
  @Cron('*/10 * * * * *')
  async releaseExpiredCounterSaleReservations() {
    const released = await this.ordersService.releaseExpiredCounterSaleReservations();
    if (released > 0) this.logger.log(`[CounterSale] Đã giải phóng ${released} lượng giữ tồn QR hết hạn.`);
  }

  /** Cancel unpaid online orders once their 24 hour payment window ends. */
  @Cron('* * * * *')
  async cancelOverdueOnlineOrders() {
    const cancelled = await this.ordersService.expireOverdueUnpaidOnlineOrders();
    if (cancelled > 0) this.logger.warn(`[Orders] Đã tự hủy ${cancelled} đơn online quá hạn thanh toán 24 giờ.`);
  }

  /** Free customer contact details after the 30-day account recovery window. */
  @Cron('* * * * *')
  async purgeExpiredDeletedCustomerContacts() {
    const recoveryCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredCustomers = {
      role: 'CUSTOMER' as const,
      isActive: false,
      deletedAt: { lte: recoveryCutoff },
    };

    const [contacts, oauthAccounts] = await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: {
          ...expiredCustomers,
          OR: [{ email: { not: null } }, { phone: { not: null } }],
        },
        data: {
          email: null,
          phone: null,
          isEmailVerified: false,
          emailVerifyToken: null,
          refreshToken: null,
        },
      }),
      this.prisma.oAuthAccount.deleteMany({
        where: { user: expiredCustomers },
      }),
    ]);

    if (contacts.count > 0 || oauthAccounts.count > 0) {
      this.logger.log(
        `[AccountRecovery] Đã giải phóng liên hệ của ${contacts.count} tài khoản và gỡ ${oauthAccounts.count} liên kết OAuth hết hạn.`,
      );
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // BOOKING V2 BACKGROUND CRON JOBS (RFC-001 Revision 3)
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * 1. Cron Nhắc Lịch 24h (Chạy mỗi giờ, quét cửa sổ 24 giờ tới)
   * An toàn multi-instance: cập nhật reminderSentAt để chống gửi trùng.
   */
  @Cron('0 * * * *')
  async remindUpcomingBookings24h() {
    this.logger.log('[BookingV2] Quét lịch hẹn cần nhắc trước 24h...');
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 3600000);

    const upcoming = await this.prisma.booking.findMany({
      where: {
        type: 'SPA',
        statusV2: 'BOOKED',
        reminderSentAt: null,
        startAt: { gte: now, lte: next24h },
      },
      include: { pet: true, customer: true },
    });

    for (const b of upcoming) {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: b.id },
          data: { reminderSentAt: new Date() },
        });

        await tx.notification.create({
          data: {
            userId: b.customerId,
            title: `Nhắc lịch Spa của ${b.pet.name}`,
            body: `Lịch ${b.code} bắt đầu lúc ${b.startAt?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Bạn có thể xem lại thông tin trong tài khoản PetCare.`,
            type: 'REMINDER',
            refId: b.id,
          },
        });
      });

      if (b.customer.email) {
        const appointmentAt = b.startAt?.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
          ?? 'vui lòng xem trong tài khoản PetCare';
        await this.mailService?.sendBusinessNotificationEmail(
          b.customer.email,
          'Nhắc lịch Spa PetCare trong 24 giờ tới',
          `Lịch ${b.code} của ${b.pet.name} diễn ra vào ${appointmentAt}. Bạn có thể xem lại thông tin trong tài khoản PetCare.`,
        );
      }
    }

    if (upcoming.length > 0) {
      this.logger.log(`[BookingV2] Đã gửi ${upcoming.length} nhắc nhở lịch hẹn 24h.`);
    }
  }

  /**
   * 2. Cron Cảnh Báo Trễ Hẹn (Chạy mỗi 15 phút)
   * Quét các ca BOOKED đã quá 20 phút mà chưa check-in (tuyệt đối không tự hủy).
   */
  @Cron('*/15 * * * *')
  async warnOverdueNoShowBookings() {
    const now = new Date();
    const overdueCutoff = new Date(now.getTime() - 20 * 60000); // Quá 20 phút

    const overdueBookings = await this.prisma.booking.findMany({
      where: {
        type: 'SPA',
        statusV2: 'BOOKED',
        startAt: { lte: overdueCutoff },
      },
      include: { pet: true, customer: true },
    });

    for (const b of overdueBookings) {
      this.logger.warn(
        `[BookingV2 Overdue Warning] Lịch hẹn ${b.code} (${b.pet.name} - ${b.customer.phone ?? b.customer.name}) trễ hơn 20 phút chưa đón bé.`,
      );
    }
  }

  /**
   * 4. Cron Chốt Ca Cuối Ngày (21:15 hàng ngày)
   * Cảnh báo ca treo qua ngày chưa bấm Done hoặc No-show.
   */
  @Cron('15 21 * * *')
  async warnUnclosedBookingsDayClose() {
    this.logger.log('[BookingV2] Kiểm tra ca treo cuối ngày...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    const unclosed = await this.prisma.booking.findMany({
      where: {
        type: 'SPA',
        statusV2: { in: ['BOOKED', 'IN_SERVICE'] },
        startAt: { gte: today, lt: tomorrow },
      },
    });

    if (unclosed.length > 0) {
      this.logger.error(
        `[BookingV2 Day Close Alert] Phát hiện ${unclosed.length} ca chưa chốt trong ngày hôm nay!`,
      );
    }
  }

  /** Assess one care fee at the first business closing after a booking became ready for pickup. */
  @Cron('* * * * *')
  async assessLatePickupFees() {
    const settings = await this.prisma.shopSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) return;

    const now = new Date();
    const today = this.vietnamDateKey(now);
    const bookings = await this.prisma.booking.findMany({
      where: {
        type: 'SPA',
        latePickupFeeAssessedAt: null,
        OR: [
          { statusV2: 'READY_FOR_PICKUP' },
          { statusV2: null, status: 'READY_FOR_PICKUP' },
        ],
      },
      orderBy: { updatedAt: 'asc' },
      take: 500,
      include: {
        statusLogs: {
          where: { toStatus: 'READY_FOR_PICKUP' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    let assessed = 0;
    for (const booking of bookings) {
      const readyAt = booking.statusLogs[0]?.createdAt ?? booking.updatedAt;
      const assessedAt = this.firstClosingAfterReady(
        readyAt,
        now,
        today,
        settings.openHours as Record<string, { open: string; close: string } | null>,
        settings.holidays,
      );
      if (!assessedAt) continue;

      const result = await this.prisma.booking.updateMany({
        where: {
          id: booking.id,
          latePickupFeeAssessedAt: null,
          OR: [
            { statusV2: 'READY_FOR_PICKUP' },
            { statusV2: null, status: 'READY_FOR_PICKUP' },
          ],
        },
        data: {
          latePickupFeeAmount: settings.latePickupFeeAmount,
          latePickupFeeAssessedAt: assessedAt,
        },
      });
      assessed += result.count;
    }

    if (assessed > 0) this.logger.log(`[LatePickupFee] Đã chốt phí chăm giữ cho ${assessed} booking.`);
  }

  private firstClosingAfterReady(
    readyAt: Date,
    now: Date,
    today: string,
    openHours: Record<string, { open: string; close: string } | null>,
    holidays: string[],
  ) {
    const cursor = new Date(`${this.vietnamDateKey(readyAt)}T00:00:00+07:00`);
    const lastDate = new Date(`${today}T00:00:00+07:00`);

    while (cursor.getTime() <= lastDate.getTime()) {
      const dateKey = this.vietnamDateKey(cursor);
      const weekday = new Date(`${dateKey}T12:00:00+07:00`).getUTCDay() || 7;
      const hours = openHours[String(weekday)];
      if (hours && !holidays.includes(dateKey)) {
        const closingAt = new Date(`${dateKey}T${hours.close}:00+07:00`);
        if (readyAt.getTime() <= closingAt.getTime()) {
          return now.getTime() >= closingAt.getTime() ? closingAt : null;
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return null;
  }

  private vietnamDateKey(date: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
}
