import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { BookingPaymentIntentStatus, BookingStatusV2, TransactionType, type Voucher } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service.js';
import { generatePaymentCode } from '../payment/payment-code.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { CreateBookingQrIntentDto } from './dto/create-booking-qr-intent.dto.js';
import { ConfirmBankTransferDto } from '../payment/dto/confirm-bank-transfer.dto.js';
import { buildTransferPaymentNote, normalizeTransferReferences, reserveTransferReferences } from '../payment/payment-references.js';
import { isVoucherExpired } from '../vouchers/voucher-expiry.js';
import { VOUCHER_UNAVAILABLE_MESSAGE } from '../vouchers/voucher-messages.js';
import { MailService } from '../../common/mail/mail.service.js';

const BOOKING_QR_TTL_MS = 15 * 60_000;

function calculateSpaBookingDiscount(
  booking: { type: string; spaBookingPromotionEligible: boolean; total: number },
  voucherSelected: boolean,
) {
  if (!booking.spaBookingPromotionEligible || voucherSelected || booking.type !== 'SPA') return 0;
  return Math.round(Math.max(0, booking.total) * 0.05);
}

function unpaidCareFee(booking: { latePickupFeeAmount: number; latePickupFeePaidAt: Date | null }) {
  return booking.latePickupFeePaidAt ? 0 : booking.latePickupFeeAmount;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  private async sendBookingPaymentReceipt(bookingId: string, transactionId: string) {
    try {
      const [booking, transaction] = await Promise.all([
        this.prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            customer: true,
            pet: true,
            services: { include: { service: true } },
          },
        }),
        this.prisma.transaction.findUnique({ where: { id: transactionId } }),
      ]);
      if (!booking?.customer?.email || !transaction) return;

      const serviceAmount = Math.max(0, transaction.amount - transaction.careFeeAmount);
      await this.mailService?.sendServicePaymentReceiptEmail(booking.customer.email, {
        bookingCode: booking.code,
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        petName: booking.pet.name,
        paidAt: transaction.createdAt,
        paymentMethod: transaction.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt',
        transferReference: transaction.externalId,
        items: serviceAmount > 0
          ? booking.services.map((item) => ({ name: item.service.name, amount: item.priceApplied }))
          : [],
        subtotal: serviceAmount > 0 ? booking.subtotal : 0,
        discount: serviceAmount > 0 ? booking.discount : 0,
        careFeeAmount: transaction.careFeeAmount,
        amountPaid: transaction.amount,
      });
    } catch {
      // The payment has committed; receipt email failures must not undo or mask it.
      this.logger.warn(`Could not prepare payment receipt for booking ${bookingId}.`);
    }
  }

  async createQrPaymentIntent(dto: CreateBookingQrIntentDto) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: dto.bookingId } });
      if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');

      const isReadyForPickup = booking.statusV2
        ? booking.statusV2 === BookingStatusV2.READY_FOR_PICKUP
        : booking.status === 'READY_FOR_PICKUP';
      if (!isReadyForPickup) {
        throw new BadRequestException('Chỉ có thể tạo mã QR khi dịch vụ đã hoàn tất và đang chờ khách nhận thú cưng.');
      }
      const careFeeAmount = unpaidCareFee(booking);
      if (booking.isPaid && careFeeAmount <= 0) throw new BadRequestException('Lịch hẹn này đã được thanh toán.');

      let voucherDiscount = 0;
      const voucherCode = dto.voucherCode?.trim().toUpperCase() || null;
      if (booking.isPaid && voucherCode) {
        throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }
      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher || !voucher.isActive) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        if (isVoucherExpired(voucher.expiryDate)) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        if (voucher.usageLimit !== -1 && voucher.usageCount >= voucher.usageLimit) {
          throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }
        if (booking.subtotal < voucher.minSpend) {
          throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }
        if (voucher.pointCost !== null) {
          const unspentVoucher = await tx.voucherUsage.findFirst({
            where: {
              voucherId: voucher.id,
              userId: booking.customerId,
              bookingId: null,
              orderId: null,
            },
          });
          if (!unspentVoucher) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          } else if (voucher.usageLimitPerUser !== -1) {
          const alreadyUsed = await tx.voucherUsage.findFirst({
            where: {
              voucherId: voucher.id,
              userId: booking.customerId,
              OR: [{ bookingId: { not: null } }, { orderId: { not: null } }],
            },
          });
          if (alreadyUsed) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }

        voucherDiscount = voucher.discountType === 'PERCENTAGE'
          ? Math.round((booking.subtotal * voucher.discountValue) / 100)
          : voucher.discountValue;
        if (voucher.maxDiscount) voucherDiscount = Math.min(voucherDiscount, voucher.maxDiscount);
      }

      const promotionDiscount = calculateSpaBookingDiscount(booking, Boolean(voucherCode));
      const serviceAmount = booking.isPaid ? 0 : Math.max(0, booking.total - voucherDiscount - promotionDiscount);
      const amount = serviceAmount + careFeeAmount;
      if (amount <= 0) {
        throw new BadRequestException('Số tiền cần thu bằng 0₫. Hãy xác nhận hóa đơn bằng tiền mặt để ghi nhận voucher và bàn giao.');
      }

      const pendingIntents = await tx.bookingPaymentIntent.findMany({
        where: { bookingId: booking.id, status: BookingPaymentIntentStatus.PENDING },
        orderBy: { createdAt: 'desc' },
      });
      const now = new Date();
      const expiredIntents = pendingIntents.filter(
        (intent) => intent.createdAt.getTime() + BOOKING_QR_TTL_MS <= now.getTime(),
      );
      if (expiredIntents.length) {
        await tx.bookingPaymentIntent.updateMany({
          where: { id: { in: expiredIntents.map((intent) => intent.id) }, status: BookingPaymentIntentStatus.PENDING },
          data: { status: BookingPaymentIntentStatus.CANCELLED },
        });
      }
      const existing = pendingIntents.find(
        (intent) => intent.createdAt.getTime() + BOOKING_QR_TTL_MS > now.getTime(),
      );
      if (existing && existing.amount === amount && existing.careFeeAmount === careFeeAmount && existing.voucherCode === voucherCode) {
        return {
          ...existing,
          bookingCode: booking.code,
          transferInfo: `${booking.code} ${existing.paymentRef}`,
          expiresAt: new Date(existing.createdAt.getTime() + BOOKING_QR_TTL_MS),
          expired: false,
        };
      }

      if (pendingIntents.length) {
        await tx.bookingPaymentIntent.updateMany({
          where: { id: { in: pendingIntents.map((intent) => intent.id) } },
          data: { status: BookingPaymentIntentStatus.CANCELLED },
        });
      }

      const paymentRef = generatePaymentCode('PCSV', 8);
      const intent = await tx.bookingPaymentIntent.create({
        data: { bookingId: booking.id, amount, careFeeAmount, voucherCode, paymentRef },
      });
      return {
        ...intent,
        bookingCode: booking.code,
        transferInfo: `${booking.code} ${paymentRef}`,
        expiresAt: new Date(intent.createdAt.getTime() + BOOKING_QR_TTL_MS),
        expired: false,
      };
    });
  }

  async findQrPaymentIntent(bookingId: string) {
    const intent = await this.prisma.bookingPaymentIntent.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
    if (!intent) return null;
    const expiresAt = new Date(intent.createdAt.getTime() + BOOKING_QR_TTL_MS);
    const expired = intent.status === BookingPaymentIntentStatus.PENDING && expiresAt.getTime() <= Date.now();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { code: true },
    });
    return {
      ...intent,
      status: expired ? BookingPaymentIntentStatus.CANCELLED : intent.status,
      expiresAt,
      expired,
      bookingCode: booking?.code,
      transferInfo: booking ? `${booking.code} ${intent.paymentRef}` : undefined,
    };
  }

  async cancelQrPaymentIntent(intentId: string) {
    const intent = await this.prisma.bookingPaymentIntent.findUnique({ where: { id: intentId } });
    if (!intent) throw new NotFoundException('Không tìm thấy mã thanh toán.');
    if (intent.status === BookingPaymentIntentStatus.COMPLETED) {
      throw new BadRequestException('Khoản thanh toán đã được xác nhận, không thể hủy mã QR.');
    }
    if (intent.status === BookingPaymentIntentStatus.REVIEW) {
      throw new BadRequestException('Khoản chuyển đang cần kiểm tra, không thể hủy mã QR.');
    }
    const cancelled = await this.prisma.bookingPaymentIntent.updateMany({
      where: { id: intent.id, status: BookingPaymentIntentStatus.PENDING, externalId: null },
      data: { status: BookingPaymentIntentStatus.CANCELLED },
    });
    if (!cancelled.count) {
      throw new BadRequestException('Mã QR đã nhận giao dịch. Hãy tải lại trạng thái thanh toán.');
    }
    return this.findQrPaymentIntent(intent.bookingId);
  }

  async confirmBookingQrPayment(intentId: string, dto: ConfirmBankTransferDto, confirmedById: string | null) {
    const references = dto.references?.length ? normalizeTransferReferences(dto.references) : [];
    const reference = references[0] ?? null;
    const intent = await this.prisma.bookingPaymentIntent.findUnique({ where: { id: intentId } });
    if (!intent) throw new NotFoundException('Không tìm thấy mã thanh toán của lịch hẹn.');
    if (
      intent.status !== BookingPaymentIntentStatus.COMPLETED &&
      intent.createdAt.getTime() + BOOKING_QR_TTL_MS <= Date.now()
    ) {
      await this.prisma.bookingPaymentIntent.updateMany({
        where: { id: intent.id, status: BookingPaymentIntentStatus.PENDING },
        data: { status: BookingPaymentIntentStatus.CANCELLED },
      });
      throw new BadRequestException(
        'Mã QR đã hết hạn sau 15 phút. Nếu khách đã chuyển theo mã này, hãy hướng khách liên hệ hỗ trợ; nếu chưa, tạo mã mới.',
      );
    }
    if (intent.status === BookingPaymentIntentStatus.COMPLETED) {
      throw new BadRequestException('Khoản thanh toán của lịch hẹn đã được xác nhận.');
    }
    if (intent.status === BookingPaymentIntentStatus.CANCELLED) {
      throw new BadRequestException('Mã QR đã bị hủy. Tạo mã mới trước khi xác nhận thanh toán.');
    }
    if (dto.receivedAmount < intent.amount) {
      throw new BadRequestException('Số tiền đã nhận chưa đủ. Hãy chờ khách chuyển nốt rồi xác nhận một lần khi tổng tiền đã đủ.');
    }
    if (dto.receivedAmount > intent.amount && !dto.excessRefunded) {
      throw new BadRequestException('Hãy hoàn phần tiền chuyển dư bên ngoài PetCare trước khi xác nhận hóa đơn.');
    }

    const booking = await this.prisma.booking.findUnique({ where: { id: intent.bookingId } });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
    const isReadyForPickup = booking.statusV2
      ? booking.statusV2 === BookingStatusV2.READY_FOR_PICKUP
      : booking.status === 'READY_FOR_PICKUP';
    if ((!booking.isPaid && !isReadyForPickup) || (booking.isPaid && (!isReadyForPickup || unpaidCareFee(booking) <= 0))) {
      throw new BadRequestException('Chỉ có thể xác nhận khoản còn phải thu khi lịch đang chờ khách nhận.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (references.length) {
        await reserveTransferReferences(tx, references, { bookingPaymentIntentId: intent.id });
      }

      const currentIntent = await tx.bookingPaymentIntent.findUnique({ where: { id: intent.id } });
      if (!currentIntent) {
        throw new BadRequestException('Mã thanh toán vừa được cập nhật. Tải lại lịch trước khi xác nhận.');
      }
      if (
        currentIntent.status !== BookingPaymentIntentStatus.COMPLETED &&
        currentIntent.createdAt.getTime() + BOOKING_QR_TTL_MS <= Date.now()
      ) {
        throw new BadRequestException(
          'Mã QR đã hết hạn sau 15 phút. Nếu khách đã chuyển theo mã này, hãy hướng khách liên hệ hỗ trợ; nếu chưa, tạo mã mới.',
        );
      }
      if (currentIntent.status !== BookingPaymentIntentStatus.PENDING && currentIntent.status !== BookingPaymentIntentStatus.REVIEW) {
        throw new BadRequestException('Mã thanh toán vừa được cập nhật. Tải lại lịch trước khi xác nhận.');
      }
      const currentBooking = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!currentBooking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
      const currentReady = currentBooking.statusV2
        ? currentBooking.statusV2 === BookingStatusV2.READY_FOR_PICKUP
        : currentBooking.status === 'READY_FOR_PICKUP';
      if (!currentReady || (currentBooking.isPaid && unpaidCareFee(currentBooking) <= 0)) {
        throw new BadRequestException('Lịch hẹn đã được thanh toán hoặc không còn khoản nào cần thu.');
      }

      const careFeeAmount = unpaidCareFee(currentBooking);
      if (currentIntent.careFeeAmount !== careFeeAmount) {
        throw new BadRequestException('Khoản cần thu đã thay đổi. Hãy hủy mã QR cũ và tạo mã mới.');
      }
      if (currentBooking.isPaid && currentIntent.voucherCode) {
        throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }

      let voucher: Voucher | null = null;
      let voucherWalletUsageId: string | null = null;
      let voucherDiscount = 0;
      if (currentIntent.voucherCode) {
        voucher = await tx.voucher.findUnique({ where: { code: currentIntent.voucherCode } });
        if (voucher) {
          await tx.$queryRaw`SELECT "id" FROM "vouchers" WHERE "id" = ${voucher.id} FOR UPDATE`;
          voucher = await tx.voucher.findUnique({ where: { id: voucher.id } });
        }
        if (!voucher || !voucher.isActive || isVoucherExpired(voucher.expiryDate)) {
          throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }
        if (voucher.usageLimit !== -1 && voucher.usageCount >= voucher.usageLimit) {
          throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }
        if (currentBooking.subtotal < voucher.minSpend) {
          throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }
        if (voucher.pointCost !== null) {
          const walletUsage = await tx.voucherUsage.findFirst({
            where: {
              voucherId: voucher.id,
              userId: currentBooking.customerId,
              bookingId: null,
              orderId: null,
            },
          });
          if (!walletUsage) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          voucherWalletUsageId = walletUsage.id;
        } else if (voucher.usageLimitPerUser !== -1) {
          const alreadyUsed = await tx.voucherUsage.findFirst({
            where: {
              voucherId: voucher.id,
              userId: currentBooking.customerId,
              OR: [{ bookingId: { not: null } }, { orderId: { not: null } }],
            },
          });
          if (alreadyUsed) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }
        voucherDiscount = voucher.discountType === 'PERCENTAGE'
          ? Math.round((currentBooking.subtotal * voucher.discountValue) / 100)
          : voucher.discountValue;
        if (voucher.maxDiscount) voucherDiscount = Math.min(voucherDiscount, voucher.maxDiscount);
      }

      const promotionDiscount = currentBooking.isPaid
        ? 0
        : calculateSpaBookingDiscount(currentBooking, Boolean(currentIntent.voucherCode));
      const serviceAmountDue = currentBooking.isPaid
        ? 0
        : Math.max(0, currentBooking.total - voucherDiscount - promotionDiscount);
      const amountDue = serviceAmountDue + careFeeAmount;
      if (amountDue !== currentIntent.amount) {
        throw new BadRequestException('Số tiền hóa đơn đã thay đổi. Hãy hủy mã QR cũ và tạo mã mới.');
      }

      const claimedIntent = await tx.bookingPaymentIntent.updateMany({
        where: { id: currentIntent.id, status: currentIntent.status },
        data: {
          status: BookingPaymentIntentStatus.COMPLETED,
          externalId: reference,
          receivedAmount: dto.receivedAmount,
        },
      });
      if (claimedIntent.count !== 1) throw new BadRequestException('Mã thanh toán vừa được xác nhận ở nơi khác.');

      if (!currentBooking.isPaid) {
        const paymentClaim = await tx.booking.updateMany({
          where: {
            id: currentBooking.id,
            isPaid: false,
            OR: [
              { statusV2: BookingStatusV2.READY_FOR_PICKUP },
              { statusV2: null, status: 'READY_FOR_PICKUP' },
            ],
          },
          data: { isPaid: true },
        });
        if (paymentClaim.count === 0) throw new BadRequestException('Lịch hẹn đã được thanh toán hoặc đổi trạng thái.');
      }
      if (careFeeAmount > 0) {
        const careFeeClaim = await tx.booking.updateMany({
          where: {
            id: currentBooking.id,
            latePickupFeePaidAt: null,
            latePickupFeeAmount: careFeeAmount,
            OR: [
              { statusV2: BookingStatusV2.READY_FOR_PICKUP },
              { statusV2: null, status: 'READY_FOR_PICKUP' },
            ],
          },
          data: { latePickupFeePaidAt: new Date() },
        });
        if (careFeeClaim.count === 0) throw new BadRequestException('Phí chăm giữ vừa được thanh toán ở nơi khác. Tải lại lịch.');
      }

      if (voucher) {
        if (voucherWalletUsageId) {
          const claimedVoucher = await tx.voucherUsage.updateMany({
            where: { id: voucherWalletUsageId, bookingId: null, orderId: null },
            data: { bookingId: currentBooking.id, usedAt: new Date() },
          });
          if (claimedVoucher.count === 0) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        } else {
          await tx.voucherUsage.create({
            data: { voucherId: voucher.id, userId: currentBooking.customerId, bookingId: currentBooking.id },
          });
        }
        await tx.voucher.update({ where: { id: voucher.id }, data: { usageCount: { increment: 1 } } });
      }

      const paymentTransaction = await tx.transaction.create({
        data: {
          bookingId: currentBooking.id,
          externalId: reference,
          amount: amountDue,
          careFeeAmount,
          receivedAmount: dto.receivedAmount,
          confirmedById,
          type: TransactionType.FINAL_PAYMENT,
          paymentMethod: 'BANK_TRANSFER',
          note: [
            buildTransferPaymentNote(
              references,
              dto.receivedAmount > amountDue
                ? `Đã nhận ${dto.receivedAmount.toLocaleString('vi-VN')}đ; đã hoàn ${(dto.receivedAmount - amountDue).toLocaleString('vi-VN')}đ tiền dư bên ngoài PetCare.`
                : confirmedById
                  ? 'Nhân viên đã đối chiếu giao dịch trên SePay và xác nhận trong PetCare.'
                  : 'SePay đã xác nhận giao dịch tự động.',
            ),
            `Tiền dịch vụ: ${serviceAmountDue.toLocaleString('vi-VN')}đ. Phí chăm giữ: ${careFeeAmount.toLocaleString('vi-VN')}đ.`,
            ...(promotionDiscount > 0 ? [`Ưu đãi đặt lịch Spa 5%: -${promotionDiscount.toLocaleString('vi-VN')}đ.`] : []),
          ].join('\n'),
        },
      });

      await tx.booking.update({
        where: { id: currentBooking.id },
        data: {
            ...(!currentBooking.isPaid && voucherDiscount + promotionDiscount > 0 && {
              discount: { increment: voucherDiscount + promotionDiscount },
              total: serviceAmountDue,
            }),
        },
      });

      const pointsEarned = currentBooking.isPaid ? 0 : Math.floor(serviceAmountDue / 10000);
      if (!currentBooking.isPaid) {
        await tx.booking.update({ where: { id: currentBooking.id }, data: { pointsAwarded: pointsEarned } });
      }
      if (pointsEarned > 0) {
        await tx.user.update({ where: { id: currentBooking.customerId }, data: { loyaltyPoints: { increment: pointsEarned } } });
        await tx.loyaltyTransaction.create({
          data: {
            userId: currentBooking.customerId,
            amount: pointsEarned,
            type: 'EARN',
            description: `Tích điểm lịch hẹn ${currentBooking.code}`,
            refId: currentBooking.id,
          },
        });
        await tx.notification.create({
          data: {
            userId: currentBooking.customerId,
            title: `Bạn nhận được ${pointsEarned} điểm tích lũy`,
            body: `Cảm ơn bạn đã sử dụng dịch vụ. Điểm tích lũy của bạn tăng thêm ${pointsEarned} điểm.`,
            type: 'LOYALTY',
            refId: currentBooking.id,
          },
        });
      }
      if (!currentBooking.isPaid) {
        await tx.petProfile.update({ where: { id: currentBooking.petId }, data: { lastGroomingAt: new Date() } });
      }
      await tx.bookingPaymentIntent.updateMany({
        where: { bookingId: currentBooking.id, status: BookingPaymentIntentStatus.PENDING },
        data: { status: BookingPaymentIntentStatus.CANCELLED },
      });

      return {
        success: true,
        bookingCode: currentBooking.code,
        awaitingHandover: true,
        receiptTransactionId: paymentTransaction.id,
      };
    });
    await this.sendBookingPaymentReceipt(intent.bookingId, result.receiptTransactionId);
    return {
      success: result.success,
      bookingCode: result.bookingCode,
      awaitingHandover: result.awaitingHandover,
    };
  }

  async create(dto: CreateTransactionDto, confirmedById: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { customer: true },
    });

    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
    const careFeeAmount = dto.type === TransactionType.FINAL_PAYMENT ? unpaidCareFee(booking) : 0;

    if (dto.type === TransactionType.FINAL_PAYMENT) {
      if (dto.paymentMethod !== 'CASH') {
        throw new BadRequestException('Chuyển khoản cần được xác nhận từ mã QR sau khi đối chiếu giao dịch trên SePay.');
      }
      const isReadyForPickup = booking.statusV2
        ? booking.statusV2 === BookingStatusV2.READY_FOR_PICKUP
        : booking.status === 'READY_FOR_PICKUP';
      if (!isReadyForPickup) {
        throw new BadRequestException('Chỉ có thể tất toán khi dịch vụ đã hoàn tất và đang chờ khách nhận thú cưng.');
      }
      if (booking.isPaid && careFeeAmount <= 0) {
        throw new BadRequestException('Lịch hẹn này đã được thanh toán.');
      }
      if (booking.isPaid && dto.voucherCode) {
        throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      if (dto.type === TransactionType.FINAL_PAYMENT && !booking.isPaid) {
        const paymentClaim = await tx.booking.updateMany({
          where: {
            id: booking.id,
            isPaid: false,
            OR: [
              { statusV2: BookingStatusV2.READY_FOR_PICKUP },
              { statusV2: null, status: 'READY_FOR_PICKUP' },
            ],
          },
          data: { isPaid: true },
        });
        if (paymentClaim.count === 0) {
          throw new BadRequestException('Lịch hẹn đã đổi trạng thái hoặc đã được thanh toán. Hãy tải lại lịch.');
        }
      }

      const newTx = await tx.transaction.create({
        data: {
          bookingId: dto.bookingId,
          amount: dto.amount,
          careFeeAmount,
          type: dto.type,
          paymentMethod: dto.paymentMethod,
          confirmedById,
          proofUrl: dto.proofUrl,
        },
      });

      // Tất toán tại quầy: dùng voucher hoặc ưu đãi đặt lịch Spa (không cộng dồn).
      if (dto.type === TransactionType.FINAL_PAYMENT) {
        // Áp dụng mã voucher (bao gồm voucher khách đổi bằng điểm) nếu thu ngân nhập mã.
        let voucherDiscount = 0;
        let voucherWalletUsageId: string | null = null;
        if (!booking.isPaid && dto.voucherCode) {
          const vCode = dto.voucherCode.trim().toUpperCase();
          const requestedVoucher = await tx.voucher.findUnique({ where: { code: vCode } });
          if (!requestedVoucher) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          await tx.$queryRaw`SELECT "id" FROM "vouchers" WHERE "id" = ${requestedVoucher.id} FOR UPDATE`;
          const voucher = await tx.voucher.findUnique({ where: { id: requestedVoucher.id } });
          if (!voucher || !voucher.isActive) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          if (isVoucherExpired(voucher.expiryDate)) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          if (voucher.usageLimit !== -1 && voucher.usageCount >= voucher.usageLimit) {
            throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          }
          if (booking.subtotal < voucher.minSpend) {
            throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          }

          if (voucher.pointCost !== null) {
            const unspentVoucher = await tx.voucherUsage.findFirst({
              where: {
                voucherId: voucher.id,
                userId: booking.customerId,
                bookingId: null,
                orderId: null,
              },
            });
            if (!unspentVoucher) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
            voucherWalletUsageId = unspentVoucher.id;
          } else if (voucher.usageLimitPerUser !== -1) {
            const alreadyUsed = await tx.voucherUsage.findFirst({
              where: {
                voucherId: voucher.id,
                userId: booking.customerId,
                OR: [{ bookingId: { not: null } }, { orderId: { not: null } }],
              },
            });
            if (alreadyUsed) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          }

          if (voucher.discountType === 'PERCENTAGE') {
            voucherDiscount = Math.round((booking.subtotal * voucher.discountValue) / 100);
            if (voucher.maxDiscount) voucherDiscount = Math.min(voucherDiscount, voucher.maxDiscount);
          } else {
            voucherDiscount = voucher.discountValue;
          }

          if (voucherWalletUsageId) {
            const claimedVoucher = await tx.voucherUsage.updateMany({
              where: { id: voucherWalletUsageId, bookingId: null, orderId: null },
              data: { bookingId: booking.id, usedAt: new Date() },
            });
            if (claimedVoucher.count === 0) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          } else {
            await tx.voucherUsage.create({
              data: {
                voucherId: voucher.id,
                userId: booking.customerId,
                bookingId: booking.id,
                usedAt: new Date(),
              },
            });
          }
          await tx.voucher.update({
            where: { id: voucher.id },
            data: { usageCount: { increment: 1 } },
          });
        }

        const promotionDiscount = calculateSpaBookingDiscount(
          booking,
          !booking.isPaid && Boolean(dto.voucherCode?.trim()),
        );
        const serviceAmountDue = booking.isPaid
          ? 0
          : Math.max(0, booking.total - voucherDiscount - promotionDiscount);
        const amountDue = serviceAmountDue + careFeeAmount;
        if (dto.amount !== amountDue) {
          throw new BadRequestException('Số tiền thu không khớp số tiền còn phải thu. Hãy tải lại hóa đơn.');
        }

        if (!booking.isPaid) {
          await tx.booking.update({
            where: { id: dto.bookingId },
            data: {
              isPaid: true,
              ...(voucherDiscount + promotionDiscount > 0 && {
                discount: { increment: voucherDiscount + promotionDiscount },
                total: serviceAmountDue,
              }),
            },
          });
        }
        if (careFeeAmount > 0) {
          const careFeeClaim = await tx.booking.updateMany({
            where: {
              id: booking.id,
              latePickupFeePaidAt: null,
              latePickupFeeAmount: careFeeAmount,
              OR: [
                { statusV2: BookingStatusV2.READY_FOR_PICKUP },
                { statusV2: null, status: 'READY_FOR_PICKUP' },
              ],
            },
            data: { latePickupFeePaidAt: new Date() },
          });
          if (careFeeClaim.count === 0) throw new BadRequestException('Phí chăm giữ vừa được thanh toán ở nơi khác. Tải lại lịch.');
        }

        await tx.transaction.update({
          where: { id: newTx.id },
          data: {
            amount: amountDue,
            careFeeAmount,
            note: [
              `Tiền dịch vụ: ${serviceAmountDue.toLocaleString('vi-VN')}đ. Phí chăm giữ: ${careFeeAmount.toLocaleString('vi-VN')}đ.`,
              ...(promotionDiscount > 0 ? [`Ưu đãi đặt lịch Spa 5%: -${promotionDiscount.toLocaleString('vi-VN')}đ.`] : []),
            ].join('\n'),
          },
        });

        // Cộng điểm tích lũy — chỉ cộng 1 lần duy nhất cho lần thu đầu tiên.
        if (!booking.isPaid) {
          const pointsEarned = Math.floor(serviceAmountDue / 10000); // 1 điểm / 10.000đ, không gồm phí chăm giữ

          await tx.booking.update({
            where: { id: dto.bookingId },
            data: { pointsAwarded: pointsEarned },
          });

          if (pointsEarned > 0) {
            await tx.user.update({
              where: { id: booking.customerId },
              data: { loyaltyPoints: { increment: pointsEarned } },
            });

            await tx.loyaltyTransaction.create({
              data: {
                userId: booking.customerId,
                amount: pointsEarned,
                type: 'EARN',
                description: `Tích điểm lịch hẹn ${booking.code}`,
                refId: booking.id,
              },
            });

            await tx.notification.create({
              data: {
                userId: booking.customerId,
                title: `Bạn nhận được ${pointsEarned} điểm tích lũy`,
                body: `Cảm ơn bạn đã sử dụng dịch vụ. Điểm tích lũy của bạn tăng thêm ${pointsEarned} điểm.`,
                type: 'LOYALTY',
                refId: booking.id,
              },
            });
          }

          await tx.petProfile.update({
            where: { id: booking.petId },
            data: { lastGroomingAt: new Date() },
          });
        }

        await tx.bookingPaymentIntent.updateMany({
          where: { bookingId: booking.id, status: BookingPaymentIntentStatus.PENDING },
          data: { status: BookingPaymentIntentStatus.CANCELLED },
        });
      }

      return newTx;
    });

    if (dto.type === TransactionType.FINAL_PAYMENT) {
      await this.sendBookingPaymentReceipt(dto.bookingId, transaction.id);
    }

    return transaction;
  }

  async findByBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');

    return this.prisma.transaction.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.transaction.findMany({
      include: {
        confirmedBy: { select: { id: true, name: true } },
        booking: {
          include: {
            customer: { select: { id: true, name: true, phone: true, email: true, loyaltyPoints: true } },
            pet: { select: { id: true, name: true, breed: true, species: true } },
            services: { include: { service: true } },
          },
        },
        order: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            items: { include: { product: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTodayAdminSummary(now = new Date()) {
    const dateKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const start = new Date(`${dateKey}T00:00:00+07:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const groupedTransactions = await this.prisma.transaction.groupBy({
      by: ['paymentMethod', 'type'],
      where: { createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return groupedTransactions.reduce(
      (summary, transaction) => {
        const amount = Number(transaction._sum.amount ?? 0);
        const signedAmount = transaction.type === 'REFUND' ? -amount : amount;
        summary.revenue += signedAmount;
        summary[transaction.paymentMethod === 'CASH' ? 'cash' : 'bankTransfer'] += signedAmount;
        summary.transactionCount += transaction._count._all;
        return summary;
      },
      { revenue: 0, cash: 0, bankTransfer: 0, transactionCount: 0 },
    );
  }

  /** GET /transactions/summary?days=7
   * Trả về tổng doanh thu + số booking theo từng ngày trong `days` ngày gần nhất.
   */
  async getDailySummary(days = 7) {
    const dayCount = Number.isInteger(days) ? Math.min(Math.max(days, 1), 30) : 7;
    const dateKey = (value: Date) => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(value);
    const todayStart = new Date(`${dateKey(new Date())}T00:00:00+07:00`);
    const since = new Date(todayStart.getTime() - (dayCount - 1) * 24 * 60 * 60 * 1000);

    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: since } },
      select: { amount: true, type: true, createdAt: true, bookingId: true, orderId: true },
    });

    // Build a map of date -> { revenue, transaction references }
    const map = new Map<string, { revenue: number; referenceIds: Set<string> }>();

    // Pre-populate all days so gaps show as zero
    for (let i = 0; i < dayCount; i++) {
      const key = dateKey(new Date(since.getTime() + i * 24 * 60 * 60 * 1000));
      map.set(key, { revenue: 0, referenceIds: new Set() });
    }

    for (const tx of transactions) {
      const key = dateKey(tx.createdAt);
      const entry = map.get(key);
      if (entry) {
        entry.revenue += Number(tx.type === 'REFUND' ? -tx.amount : tx.amount);
        entry.referenceIds.add(tx.bookingId ?? tx.orderId ?? `transaction:${tx.createdAt.toISOString()}`);
      }
    }

    const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return Array.from(map.entries()).map(([date, { revenue, referenceIds }]) => ({
      date,
      name: DAY_NAMES[new Date(`${date}T12:00:00+07:00`).getUTCDay()],
      revenue,
      bookings: referenceIds.size,
    }));
  }
}
