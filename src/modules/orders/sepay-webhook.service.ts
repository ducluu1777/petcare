import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentMethod, Prisma, SepayWebhookEventStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PaymentService } from '../payment/payment.service.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import { matchOnlineOrderPayment, SepayIncomingTransfer, verifySepaySignature } from './sepay-webhook.js';
import { OrdersService } from './orders.service.js';

@Injectable()
export class SepayWebhookService {
  private readonly bookingIntentTtlMs = 15 * 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly payment: PaymentService,
    private readonly transactions: TransactionsService,
    private readonly orders: OrdersService,
  ) {}

  async receive(rawBody: Buffer | undefined, timestamp: string | undefined, signature: string | undefined) {
    const secret = this.config.get<string>('SEPAY_WEBHOOK_SECRET')?.trim();
    if (!secret || !rawBody) throw new ServiceUnavailableException('Webhook SePay chưa được cấu hình.');
    if (!verifySepaySignature(rawBody, timestamp ?? '', signature ?? '', secret)) {
      throw new UnauthorizedException('Chữ ký webhook SePay không hợp lệ.');
    }
    let payload: SepayIncomingTransfer;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as SepayIncomingTransfer;
    } catch {
      throw new BadRequestException('JSON webhook SePay không hợp lệ.');
    }
    if ((typeof payload.id !== 'number' && typeof payload.id !== 'string')
      || !String(payload.id).trim()
      || typeof payload.accountNumber !== 'string'
      || typeof payload.transferType !== 'string'
      || !Number.isInteger(payload.transferAmount)
      || (payload.code !== undefined && payload.code !== null && typeof payload.code !== 'string')
      || (payload.subAccount !== undefined && payload.subAccount !== null && typeof payload.subAccount !== 'string')
      || (payload.referenceCode !== undefined && payload.referenceCode !== null && typeof payload.referenceCode !== 'string')) {
      throw new UnauthorizedException('Dữ liệu webhook SePay không hợp lệ.');
    }
    const recipient = this.payment.getSepayAccountConfig('ORDER');
    if (!recipient.configured || !recipient.accountNumber) throw new ServiceUnavailableException('Tài khoản nhận tiền chưa được cấu hình.');
    const webhookAccount = this.payment.getSepayWebhookAccountConfig();
    if (!webhookAccount.accountNumber) throw new ServiceUnavailableException('Tài khoản đối chiếu SePay chưa được cấu hình.');
    const eventId = String(payload.id);
    if (await this.prisma.sepayWebhookEvent.findUnique({ where: { id: eventId } })) {
      return { success: true };
    }

    if (payload.code) {
      const onlineOrder = await this.prisma.order.findUnique({ where: { paymentCode: payload.code } });
      if (!onlineOrder) {
        const bookingIntent = await this.prisma.bookingPaymentIntent.findUnique({
          where: { paymentRef: payload.code },
          include: { booking: true },
        });
        if (bookingIntent) {
          return this.receiveBookingIntent(payload, eventId, bookingIntent, webhookAccount);
        }

        const orderIntent = await this.prisma.orderPaymentIntent.findUnique({
          where: { paymentRef: payload.code },
          include: { order: true },
        });
        if (orderIntent?.order.source === 'IN_STORE') {
          return this.receiveCounterSaleIntent(payload, eventId, orderIntent, webhookAccount);
        }
      }
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (await tx.sepayWebhookEvent.findUnique({ where: { id: eventId } })) return;
        const order = payload.code
          ? await tx.order.findUnique({ where: { paymentCode: payload.code } })
          : null;
        let reason = order
          ? matchOnlineOrderPayment(payload, order, webhookAccount.accountNumber, new Date(), webhookAccount.subAccount)
          : 'UNKNOWN_CODE';
        const referenceCode = payload.referenceCode?.trim() || null;
        if (!reason && referenceCode) {
          const usedReference = await tx.bankTransferReference.findUnique({ where: { reference: referenceCode } });
          if (usedReference) reason = 'REFERENCE_ALREADY_USED';
        }
        await tx.sepayWebhookEvent.create({
          data: {
            id: eventId,
            orderId: order?.id ?? null,
            paymentCode: payload.code,
            accountNumber: payload.accountNumber,
            transferType: payload.transferType,
            amount: payload.transferAmount,
            referenceCode,
            status: reason ? SepayWebhookEventStatus.REVIEW : SepayWebhookEventStatus.CONFIRMED,
            reason,
          },
        });
        if (reason || !order) return;
        const claimed = await tx.order.updateMany({
          where: {
            id: order.id,
            isPaid: false,
            status: OrderStatus.PENDING,
            paymentExpiresAt: { gt: new Date() },
          },
          data: { isPaid: true, paymentMethod: PaymentMethod.BANK_TRANSFER },
        });
        if (claimed.count !== 1) {
          await tx.sepayWebhookEvent.update({
            where: { id: eventId },
            data: { status: SepayWebhookEventStatus.REVIEW, reason: 'ORDER_CHANGED' },
          });
          return;
        }
        if (referenceCode) {
          await tx.bankTransferReference.create({ data: { reference: referenceCode, orderId: order.id } });
        }
        await tx.transaction.create({
          data: {
            orderId: order.id,
            externalId: `SEPAY:${eventId}`,
            amount: order.total,
            receivedAmount: payload.transferAmount,
            type: 'FINAL_PAYMENT',
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            note: `SePay tự xác nhận giao dịch ${eventId}${referenceCode ? `; mã ngân hàng ${referenceCode}` : ''}.`,
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const alreadyRecorded = await this.prisma.sepayWebhookEvent.findUnique({ where: { id: eventId } });
        if (alreadyRecorded) return { success: true };
      }
      throw error;
    }
    return { success: true };
  }

  private async receiveBookingIntent(
    payload: SepayIncomingTransfer,
    eventId: string,
    intent: Prisma.BookingPaymentIntentGetPayload<{ include: { booking: true } }>,
    webhookAccount: { accountNumber: string; subAccount: string | null },
  ) {
    const referenceCode = payload.referenceCode?.trim() || null;
    const reference = referenceCode || `SEPAY:${eventId}`;
    const reason = this.getIntentReviewReason(
      payload,
      webhookAccount,
      intent.amount,
      intent.status,
      new Date(intent.createdAt.getTime() + this.bookingIntentTtlMs),
    );
    const eventData = {
      id: eventId,
      bookingId: intent.bookingId,
      paymentCode: payload.code,
      accountNumber: payload.accountNumber,
      transferType: payload.transferType,
      amount: payload.transferAmount,
      referenceCode,
    };

    if (intent.status === 'COMPLETED' && intent.externalId === reference) {
      await this.recordWebhookEvent({
        ...eventData,
        status: SepayWebhookEventStatus.CONFIRMED,
        reason: null,
      });
      return { success: true };
    }
    if (reason || intent.status !== 'PENDING') {
      await this.recordWebhookEvent({
        ...eventData,
        status: SepayWebhookEventStatus.REVIEW,
        reason: reason ?? 'INTENT_NOT_PAYABLE',
      });
      return { success: true };
    }
    if (await this.prisma.bankTransferReference.findUnique({ where: { reference } })) {
      const current = await this.prisma.bookingPaymentIntent.findUnique({ where: { id: intent.id } });
      await this.recordWebhookEvent({
        ...eventData,
        status: current?.status === 'COMPLETED' && current.externalId === reference
          ? SepayWebhookEventStatus.CONFIRMED
          : SepayWebhookEventStatus.REVIEW,
        reason: current?.status === 'COMPLETED' && current.externalId === reference
          ? null
          : 'REFERENCE_ALREADY_USED',
      });
      return { success: true };
    }

    try {
      await this.transactions.confirmBookingQrPayment(
        intent.id,
        { references: [reference], receivedAmount: payload.transferAmount, excessRefunded: false },
        null,
      );
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      const current = await this.prisma.bookingPaymentIntent.findUnique({ where: { id: intent.id } });
      if (current?.status === 'COMPLETED' && current.externalId === reference) {
        await this.recordWebhookEvent({ ...eventData, status: SepayWebhookEventStatus.CONFIRMED, reason: null });
        return { success: true };
      }
      await this.recordWebhookEvent({
        ...eventData,
        status: SepayWebhookEventStatus.REVIEW,
        reason: 'PAYMENT_CHANGED',
      });
      return { success: true };
    }

    await this.recordWebhookEvent({ ...eventData, status: SepayWebhookEventStatus.CONFIRMED, reason: null });
    return { success: true };
  }

  private async receiveCounterSaleIntent(
    payload: SepayIncomingTransfer,
    eventId: string,
    intent: Prisma.OrderPaymentIntentGetPayload<{ include: { order: true } }>,
    webhookAccount: { accountNumber: string; subAccount: string | null },
  ) {
    const referenceCode = payload.referenceCode?.trim() || null;
    const reference = referenceCode || `SEPAY:${eventId}`;
    const reason = this.getIntentReviewReason(
      payload,
      webhookAccount,
      intent.amount,
      intent.status,
      intent.expiresAt,
    );
    const eventData = {
      id: eventId,
      orderId: intent.orderId,
      paymentCode: payload.code,
      accountNumber: payload.accountNumber,
      transferType: payload.transferType,
      amount: payload.transferAmount,
      referenceCode,
    };

    if (intent.status === 'COMPLETED' && intent.externalId === reference) {
      await this.recordWebhookEvent({
        ...eventData,
        status: SepayWebhookEventStatus.CONFIRMED,
        reason: null,
      });
      return { success: true };
    }
    if (reason || intent.status !== 'PENDING' || intent.order.status !== 'PENDING' || intent.order.isPaid) {
      await this.recordWebhookEvent({
        ...eventData,
        status: SepayWebhookEventStatus.REVIEW,
        reason: reason ?? 'ORDER_NOT_PAYABLE',
      });
      return { success: true };
    }
    if (await this.prisma.bankTransferReference.findUnique({ where: { reference } })) {
      const current = await this.prisma.orderPaymentIntent.findUnique({ where: { id: intent.id } });
      await this.recordWebhookEvent({
        ...eventData,
        status: current?.status === 'COMPLETED' && current.externalId === reference
          ? SepayWebhookEventStatus.CONFIRMED
          : SepayWebhookEventStatus.REVIEW,
        reason: current?.status === 'COMPLETED' && current.externalId === reference
          ? null
          : 'REFERENCE_ALREADY_USED',
      });
      return { success: true };
    }

    try {
      await this.orders.confirmCounterSaleTransfer(
        intent.id,
        { references: [reference], receivedAmount: payload.transferAmount, excessRefunded: false },
        null,
      );
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      const current = await this.prisma.orderPaymentIntent.findUnique({ where: { id: intent.id } });
      if (current?.status === 'COMPLETED' && current.externalId === reference) {
        await this.recordWebhookEvent({ ...eventData, status: SepayWebhookEventStatus.CONFIRMED, reason: null });
        return { success: true };
      }
      await this.recordWebhookEvent({
        ...eventData,
        status: SepayWebhookEventStatus.REVIEW,
        reason: 'PAYMENT_CHANGED',
      });
      return { success: true };
    }

    await this.recordWebhookEvent({ ...eventData, status: SepayWebhookEventStatus.CONFIRMED, reason: null });
    return { success: true };
  }

  private getIntentReviewReason(
    payload: SepayIncomingTransfer,
    webhookAccount: { accountNumber: string; subAccount: string | null },
    expectedAmount: number,
    status: string,
    expiresAt: Date,
  ) {
    if (payload.transferType !== 'in') return 'NOT_INCOMING';
    if (payload.accountNumber.replace(/\s/g, '') !== webhookAccount.accountNumber) return 'WRONG_ACCOUNT';
    if (webhookAccount.subAccount && payload.subAccount?.replace(/\s/g, '') !== webhookAccount.subAccount) return 'WRONG_SUB_ACCOUNT';
    if (payload.transferAmount !== expectedAmount) return 'AMOUNT_MISMATCH';
    if (status !== 'PENDING') return 'INTENT_NOT_PAYABLE';
    if (expiresAt <= new Date()) return 'OVERDUE';
    return null;
  }

  private async recordWebhookEvent(data: Prisma.SepayWebhookEventUncheckedCreateInput) {
    try {
      await this.prisma.sepayWebhookEvent.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.sepayWebhookEvent.findUnique({ where: { id: data.id } });
        if (existing) return;
      }
      throw error;
    }
  }

  listReview(id?: string) {
    return this.prisma.sepayWebhookEvent.findMany({
      where: { status: SepayWebhookEventStatus.REVIEW, ...(id ? { id } : {}) },
      include: {
        order: { select: { id: true, code: true, status: true, total: true, isPaid: true } },
        booking: { select: { id: true, code: true, status: true, total: true, isPaid: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: id ? 1 : 100,
    });
  }

  async getDashboard(page = 1) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const pageSize = 20;
    const reviewWhere = { status: SepayWebhookEventStatus.REVIEW };
    const [reviewCount, reviews, recentConfirmed, latestEvent] = await Promise.all([
      this.prisma.sepayWebhookEvent.count({ where: reviewWhere }),
      this.prisma.sepayWebhookEvent.findMany({
        where: reviewWhere,
        include: {
          order: { select: { id: true, code: true } },
          booking: { select: { id: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sepayWebhookEvent.findMany({
        where: { status: SepayWebhookEventStatus.CONFIRMED },
        include: {
          order: { select: { id: true, code: true } },
          booking: { select: { id: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.sepayWebhookEvent.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);
    return {
      configured: this.payment.getSepayAccountConfig('ORDER').configured,
      lastReceivedAt: latestEvent?.createdAt ?? null,
      reviewCount,
      reviews,
      reviewPage: safePage,
      reviewPageSize: pageSize,
      recentConfirmed,
    };
  }

  async markReviewed(id: string, note: string, reviewedById: string) {
    const reviewNote = note.trim();
    if (!reviewNote) throw new BadRequestException('Cần ghi cách đã xử lý giao dịch.');
    const changed = await this.prisma.sepayWebhookEvent.updateMany({
      where: { id, status: SepayWebhookEventStatus.REVIEW },
      data: { status: SepayWebhookEventStatus.REVIEWED, reviewNote, reviewedById, reviewedAt: new Date() },
    });
    if (changed.count !== 1) throw new NotFoundException('Giao dịch này không còn chờ đối chiếu.');
    return this.prisma.sepayWebhookEvent.findUnique({ where: { id } });
  }
}
