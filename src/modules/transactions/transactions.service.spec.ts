import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BookingStatus, PaymentMethod, TransactionType } from '@prisma/client';

import { TransactionsService } from './transactions.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('TransactionsService - Cashier final payment', () => {
  let service: TransactionsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      booking: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      bookingPaymentIntent: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      transaction: {
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      loyaltyTransaction: {
        create: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
      petProfile: {
        update: vi.fn(),
      },
      voucher: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      voucherUsage: {
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a service payment intent with a PCSV payment reference', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-123',
      code: 'LH-240901',
      status: BookingStatus.READY_FOR_PICKUP,
      statusV2: 'READY_FOR_PICKUP',
      subtotal: 500000,
      total: 500000,
      isPaid: false,
      latePickupFeeAmount: 0,
      latePickupFeePaidAt: null,
    });
    prismaMock.bookingPaymentIntent.create.mockImplementation(async ({ data }) => ({
      id: 'intent-1',
      ...data,
      createdAt: new Date(),
    }));

    await service.createQrPaymentIntent({ bookingId: 'booking-123' });

    expect(prismaMock.bookingPaymentIntent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentRef: expect.stringMatching(/^PCSV[A-Z0-9]{8}$/),
        }),
      }),
    );
  });

  it('collects the full amount due and earns points without redeeming points against the invoice', async () => {
    const mockBooking = {
      id: 'booking-123',
      code: 'LH-240901',
      customerId: 'user-456',
      petId: 'pet-789',
      status: BookingStatus.READY_FOR_PICKUP,
      statusV2: 'READY_FOR_PICKUP',
      subtotal: 500000,
      discount: 0,
      total: 500000,
      isPaid: false,
      latePickupFeeAmount: 0,
      latePickupFeePaidAt: null,
      customer: { id: 'user-456', loyaltyPoints: 100 },
    };

    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-456', loyaltyPoints: 100 });
    prismaMock.transaction.create.mockResolvedValue({ id: 'tx-1', amount: 500000 });

    const result = await service.create({
      bookingId: 'booking-123',
      amount: 500000,
      type: TransactionType.FINAL_PAYMENT,
      paymentMethod: PaymentMethod.CASH,
    });

    expect(result).toBeDefined();
    expect(prismaMock.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 500000, type: TransactionType.FINAL_PAYMENT }),
      }),
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-456' },
        data: { loyaltyPoints: { increment: 50 } },
      }),
    );
    expect(prismaMock.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-456',
          amount: 50,
          type: 'EARN',
          refId: 'booking-123',
        }),
      }),
    );
    expect(prismaMock.user.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { loyaltyPoints: { decrement: expect.any(Number) } } }),
    );
    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-123' },
        data: expect.objectContaining({
          isPaid: true,
        }),
      }),
    );
  });

  it('rejects a final payment below the amount due without applying a points discount', async () => {
    const mockBooking = {
      id: 'booking-123',
      code: 'LH-240901',
      customerId: 'user-456',
      petId: 'pet-789',
      status: BookingStatus.READY_FOR_PICKUP,
      subtotal: 500000,
      discount: 0,
      total: 500000,
      latePickupFeeAmount: 0,
      latePickupFeePaidAt: null,
      customer: { id: 'user-456', loyaltyPoints: 20 },
    };

    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-456', loyaltyPoints: 20 });

    await expect(
      service.create({
        bookingId: 'booking-123',
        amount: 400000,
        type: TransactionType.FINAL_PAYMENT,
        paymentMethod: PaymentMethod.CASH,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  const eligibleSpaBooking = () => ({
    id: 'booking-promotion', code: 'BK-PROMOTION', customerId: 'customer-1', petId: 'pet-1',
    type: 'SPA', status: BookingStatus.READY_FOR_PICKUP, statusV2: 'READY_FOR_PICKUP',
    subtotal: 500000, discount: 0, total: 500000, isPaid: false,
    spaBookingPromotionEligible: true, latePickupFeeAmount: 0, latePickupFeePaidAt: null,
    customer: { id: 'customer-1', email: null },
  });

  it('keeps the 5% discount and points based on actual cash collected after renaming', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(eligibleSpaBooking());
    prismaMock.transaction.create.mockResolvedValue({ id: 'payment-1', amount: 475000 });
    prismaMock.transaction.findUnique = vi.fn().mockResolvedValue(null);

    await service.create({ bookingId: 'booking-promotion', amount: 475000, type: TransactionType.FINAL_PAYMENT, paymentMethod: PaymentMethod.CASH }, 'staff-1');

    expect(prismaMock.booking.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ total: 475000, discount: { increment: 25000 } }) }));
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { loyaltyPoints: { increment: 47 } } }));
    expect(prismaMock.transaction.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ note: expect.stringContaining('Ưu đãi đặt lịch Spa 5%') }) }));
  });

  it('keeps the 5% discount when creating a service QR after renaming', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(eligibleSpaBooking());
    prismaMock.bookingPaymentIntent.create.mockImplementation(async ({ data }) => ({ id: 'intent-promotion', ...data, createdAt: new Date() }));

    const result = await service.createQrPaymentIntent({ bookingId: 'booking-promotion' });

    expect(result.amount).toBe(475000);
    expect(result.paymentRef).toMatch(/^PCSV[A-Z0-9]{8}$/);
  });

  it('keeps the 5% discount when confirming a service QR after renaming', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(eligibleSpaBooking());
    prismaMock.bookingPaymentIntent.findUnique = vi.fn().mockResolvedValue({ id: 'intent-promotion', bookingId: 'booking-promotion', amount: 475000, careFeeAmount: 0, status: 'PENDING', voucherCode: null, createdAt: new Date() });
    prismaMock.transaction.create.mockResolvedValue({ id: 'payment-1' });
    prismaMock.transaction.findUnique = vi.fn().mockResolvedValue(null);

    await service.confirmBookingQrPayment('intent-promotion', { receivedAmount: 475000 }, 'staff-1');

    expect(prismaMock.transaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: 475000, note: expect.stringContaining('Ưu đãi đặt lịch Spa 5%') }) }));
    expect(prismaMock.booking.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ total: 475000, discount: { increment: 25000 } }) }));
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { loyaltyPoints: { increment: 47 } } }));
  });

  it('rejects final payment for terminal V2 bookings before creating a transaction', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-cancelled',
      status: BookingStatus.CONFIRMED,
      statusV2: 'CANCELLED',
      isPaid: false,
      latePickupFeeAmount: 0,
      latePickupFeePaidAt: null,
      customerId: 'user-456',
    });

    await expect(service.create({
      bookingId: 'booking-cancelled',
      amount: 100000,
      type: TransactionType.FINAL_PAYMENT,
      paymentMethod: PaymentMethod.CASH,
    })).rejects.toThrow(BadRequestException);

    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate final payment for V2 bookings already paid', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-paid',
      status: BookingStatus.READY_FOR_PICKUP,
      statusV2: 'READY_FOR_PICKUP',
      isPaid: true,
      latePickupFeeAmount: 0,
      latePickupFeePaidAt: null,
      customerId: 'user-456',
    });

    await expect(service.create({
      bookingId: 'booking-paid',
      amount: 100000,
      type: TransactionType.FINAL_PAYMENT,
      paymentMethod: PaymentMethod.CASH,
    })).rejects.toThrow(BadRequestException);

    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it('claims an unpaid V2 booking conditionally so concurrent cashier requests cannot double-charge', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-raced',
      status: BookingStatus.READY_FOR_PICKUP,
      statusV2: 'READY_FOR_PICKUP',
      isPaid: false,
      latePickupFeeAmount: 0,
      latePickupFeePaidAt: null,
      customerId: 'user-456',
    });
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.create({
      bookingId: 'booking-raced',
      amount: 100000,
      type: TransactionType.FINAL_PAYMENT,
      paymentMethod: PaymentMethod.CASH,
    })).rejects.toThrow(BadRequestException);

    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  describe('getDailySummary', () => {
    it('should aggregate revenue and distinct bookings per day for the last N days', async () => {
      const today = new Date();
      prismaMock.transaction.findMany = vi.fn().mockResolvedValue([
        { amount: 150000, createdAt: today, bookingId: 'b-1' },
        { amount: 200000, createdAt: today, bookingId: 'b-1' }, // same booking
        { amount: 300000, createdAt: today, bookingId: 'b-2' }, // different booking
      ]);

      const summary = await service.getDailySummary(7);

      expect(summary).toHaveLength(7);
      const todayEntry = summary[summary.length - 1];
      expect(todayEntry.revenue).toBe(650000);
      expect(todayEntry.bookings).toBe(2);
      expect(todayEntry).toHaveProperty('name');
      expect(todayEntry).toHaveProperty('date');
    });
  });
});
