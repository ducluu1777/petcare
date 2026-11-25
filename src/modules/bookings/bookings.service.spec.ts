import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BookingSource, BookingStatus, Role, ServiceCategory } from '@prisma/client';

import { BookingsService } from './bookings.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ServicesService } from '../services/services.service.js';
import { requestFingerprint } from '../../common/idempotency.js';

describe('BookingsService - Addon & Status Transitions', () => {
  let service: BookingsService;
  let prismaMock: any;
  let servicesMock: any;

  beforeEach(async () => {
    prismaMock = {
      booking: {
        count: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      service: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn(),
      },
      petProfile: { findUnique: vi.fn() },
      bookingService: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      timeSlot: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      shopSettings: { findUnique: vi.fn() },
      sizeTier: { findFirst: vi.fn(), findMany: vi.fn() },
      servicePrice: { findMany: vi.fn() },
      bookingStatusLog: { create: vi.fn() },
      user: { findUnique: vi.fn(), update: vi.fn() },
      $executeRaw: vi.fn(),
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    servicesMock = {
      calculatePrice: vi.fn().mockResolvedValue({
        serviceId: 'srv-addon-1',
        priceApplied: 50000,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ServicesService, useValue: servicesMock },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('finds todays bookings by current SPA date fields using appointment dates', async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);

    await service.findToday();

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { timeSlot: { slotDate: { gte: expect.any(Date), lt: expect.any(Date) } } },
            { startAt: { gte: expect.any(Date), lt: expect.any(Date) } },
          ],
        },
      }),
    );
  });

  it('searches bookings across pages by booking code, customer, pet, or phone', async () => {
    prismaMock.booking.count.mockResolvedValue(1);
    prismaMock.booking.findMany.mockResolvedValue([]);

    await service.findAll({ q: 'Mimi', page: 2, limit: 20 });

    const searchWhere = {
      OR: [
        { code: { contains: 'Mimi', mode: 'insensitive' } },
        { customer: { name: { contains: 'Mimi', mode: 'insensitive' } } },
        { customer: { phone: { contains: 'Mimi' } } },
        { pet: { name: { contains: 'Mimi', mode: 'insensitive' } } },
        { pet: { breed: { contains: 'Mimi', mode: 'insensitive' } } },
      ],
    };
    expect(prismaMock.booking.count).toHaveBeenCalledWith({ where: searchWhere });
    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: searchWhere, skip: 20, take: 20 }),
    );
  });

  it('combines the booking-status filter and search instead of letting either overwrite the other', async () => {
    prismaMock.booking.count.mockResolvedValue(0);
    prismaMock.booking.findMany.mockResolvedValue([]);

    await service.findAll({ statusFilter: 'WAITING_CHECKIN', q: 'Mimi' });

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { OR: [
            { statusV2: 'BOOKED' },
            { statusV2: null, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } },
          ] },
          { OR: [
            { code: { contains: 'Mimi', mode: 'insensitive' } },
            { customer: { name: { contains: 'Mimi', mode: 'insensitive' } } },
            { customer: { phone: { contains: 'Mimi' } } },
            { pet: { name: { contains: 'Mimi', mode: 'insensitive' } } },
            { pet: { breed: { contains: 'Mimi', mode: 'insensitive' } } },
          ] },
        ],
      },
    }));
  });

  it('limits calendar results to the selected date range, including legacy slot-based bookings', async () => {
    prismaMock.booking.count.mockResolvedValue(0);
    prismaMock.booking.findMany.mockResolvedValue([]);

    await service.findAll({ dateFrom: '2026-10-01', dateTo: '2026-11-01', page: 1, limit: 100 });

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { startAt: { gte: new Date('2026-10-01T00:00:00+07:00'), lt: new Date('2026-11-01T00:00:00+07:00') } },
          { startAt: null, timeSlot: { slotDate: { gte: new Date('2026-10-01T00:00:00+07:00'), lt: new Date('2026-11-01T00:00:00+07:00') } } },
        ],
      },
      take: 100,
    }));
  });

  it('returns the slot response shape expected by the booking page on holidays', async () => {
    prismaMock.shopSettings.findUnique.mockResolvedValue({
      holidays: ['2026-10-18'],
    });

    await expect(
      service.getAvailableSlots({ date: '2026-10-18', serviceIds: ['spa-1'] }),
    ).resolves.toEqual({ date: '2026-10-18', slots: [] });
  });

  it('returns available start slots for an open day without duration estimates', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-26T00:00:00.000Z'));
    prismaMock.shopSettings.findUnique.mockResolvedValue({
      holidays: [],
      openHours: { '2': { open: '08:00', close: '10:00' } },
      slotStepMin: 30,
      minNoticeHours: 0,
      bufferMin: 0,
      capacity: 3,
      webCapacity: 3,
    });
    prismaMock.service.findMany.mockResolvedValue([{ id: 'spa-1', category: ServiceCategory.BATH }]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    try {
      const result = await service.getAvailableSlots({ date: '2026-10-27', serviceIds: ['spa-1'] });

      expect(result.date).toBe('2026-10-27');
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots[0]).toMatchObject({ time: expect.any(String), available: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses receptionist capacity and does not apply customer web booking limits to admin availability', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T01:00:00.000Z'));
    prismaMock.shopSettings.findUnique.mockResolvedValue({
      holidays: [],
      openHours: { '5': { open: '08:00', close: '10:00' } },
      slotStepMin: 30,
      minNoticeHours: 4,
      maxAdvanceDays: 1,
      capacity: 2,
      webCapacity: 0,
    });
    prismaMock.service.findMany.mockResolvedValue([{ id: 'spa-1', category: ServiceCategory.BATH }]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    try {
      const dto = { date: '2026-10-23', serviceIds: ['spa-1'] };
      const receptionistSlots = await service.getAvailableSlots(dto, BookingSource.RECEPTIONIST);
      const webSlots = await service.getAvailableSlots(dto);

      expect(receptionistSlots.slots.some((slot) => slot.available)).toBe(true);
      expect(webSlots.slots.some((slot) => slot.available)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reserves the web-only capacity allowance for online bookings, not receptionist appointments', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T01:00:00.000Z'));
    prismaMock.shopSettings.findUnique.mockResolvedValue({
      holidays: [],
      openHours: { '4': { open: '08:00', close: '10:00' } },
      slotStepMin: 30,
      minNoticeHours: 0,
      maxAdvanceDays: 5,
      capacity: 3,
      webCapacity: 0,
    });
    prismaMock.service.findMany.mockResolvedValue([{ id: 'spa-1', category: ServiceCategory.BATH }]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    try {
      const dto = { date: '2026-10-22', serviceIds: ['spa-1'] };
      const receptionistSlots = await service.getAvailableSlots(dto, BookingSource.RECEPTIONIST);
      const webSlots = await service.getAvailableSlots(dto);

      expect(receptionistSlots.slots[0]).toMatchObject({ available: true, remaining: 3 });
      expect(webSlots.slots[0]).toMatchObject({ available: false, remaining: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps past and too-soon times unavailable for web while allowing staff to book future same-day slots', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T02:00:00.000Z'));
    prismaMock.shopSettings.findUnique.mockResolvedValue({
      holidays: [],
      openHours: { '2': { open: '08:00', close: '11:00' } },
      slotStepMin: 30,
      minNoticeHours: 4,
      maxAdvanceDays: 30,
      capacity: 2,
      webCapacity: null,
    });
    prismaMock.service.findMany.mockResolvedValue([{ id: 'spa-1', category: ServiceCategory.BATH }]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    try {
      const dto = { date: '2026-10-27', serviceIds: ['spa-1'] };
      const receptionistSlots = await service.getAvailableSlots(dto, BookingSource.RECEPTIONIST);
      const webSlots = await service.getAvailableSlots(dto);

      expect(receptionistSlots.slots.find((slot) => slot.time === '09:00')?.available).toBe(false);
      expect(receptionistSlots.slots.find((slot) => slot.time === '09:30')?.available).toBe(true);
      expect(webSlots.slots.find((slot) => slot.time === '09:30')?.available).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects an impossible calendar date before looking up availability', async () => {
    await expect(service.getAvailableSlots({ date: '2026-02-31', serviceIds: [] }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not advertise slots beyond the maximum advance booking window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T01:00:00.000Z'));
    prismaMock.shopSettings.findUnique.mockResolvedValue({
      holidays: [], openHours: { '5': { open: '08:30', close: '18:30' } },
      slotStepMin: 30, minNoticeHours: 0, maxAdvanceDays: 1, capacity: 3,
    });
    prismaMock.service.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    try {
      const result = await service.getAvailableSlots({ date: '2026-10-23', serviceIds: [] });
      expect(result.slots.filter((slot) => slot.available)).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects rescheduling a booking to a time that has already passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T02:00:00.000Z'));

    try {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: 'bk-reschedule-past',
        customerId: 'customer-1',
        statusV2: 'BOOKED',
        startAt: new Date('2026-10-20T02:00:00.000Z'),
        source: 'RECEPTIONIST',
      });
      prismaMock.shopSettings.findUnique.mockResolvedValue({
        id: 'singleton',
        cancelBeforeHours: 4,
        holidays: [],
        slotStepMin: 30,
        capacity: 3,
        openHours: { '1': { open: '08:00', close: '18:30' } },
      });
      prismaMock.booking.findMany.mockResolvedValue([]);

      await expect(service.rescheduleAppointmentTx(
        'bk-reschedule-past',
        { userId: 'staff-1', role: Role.STAFF },
        { newStartAt: '2026-10-19T01:30:00.000Z' },
      )).rejects.toThrow(BadRequestException);

      expect(prismaMock.booking.update).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should throw BadRequestException when adding addon to a PENDING booking', async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce({
      id: 'bk-1',
      petId: 'pet-1',
      status: BookingStatus.PENDING,
    });

    await expect(
      service.updateAddons('bk-1', { addServiceIds: ['srv-addon-1'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow adding addon when booking is CONFIRMED', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'bk-2',
      petId: 'pet-1',
      status: BookingStatus.CONFIRMED,
      discount: 0,
    });

    await service.updateAddons('bk-2', { addServiceIds: ['srv-addon-1'] });
    expect(servicesMock.calculatePrice).toHaveBeenCalledWith('srv-addon-1', 'pet-1');
    expect(prismaMock.bookingService.createMany).toHaveBeenCalled();
  });

  it('should allow adding addon when booking is IN_PROGRESS', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'bk-3',
      petId: 'pet-1',
      status: BookingStatus.IN_PROGRESS,
      discount: 0,
    });

    await service.updateAddons('bk-3', { addServiceIds: ['srv-addon-1'] });
    expect(servicesMock.calculatePrice).toHaveBeenCalledWith('srv-addon-1', 'pet-1');
    expect(prismaMock.bookingService.createMany).toHaveBeenCalled();
  });

  it('rejects add-on edits for completed V2 bookings even when the legacy status is CONFIRMED', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'bk-v2-done',
      petId: 'pet-1',
      status: BookingStatus.CONFIRMED,
      statusV2: 'DONE',
      discount: 0,
    });

    await expect(
      service.updateAddons('bk-v2-done', { addServiceIds: ['srv-addon-1'] }),
    ).rejects.toThrow(BadRequestException);

    expect(servicesMock.calculatePrice).not.toHaveBeenCalled();
    expect(prismaMock.bookingService.createMany).not.toHaveBeenCalled();
  });

  it('does not report a service as removed when the requested line is missing or is not an add-on', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'bk-remove',
      petId: 'pet-1',
      status: BookingStatus.CONFIRMED,
      statusV2: 'BOOKED',
      discount: 0,
    });
    prismaMock.bookingService.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.updateAddons('bk-remove', {
      removeBookingServiceIds: ['67d3b1c2-12c9-4d8c-a1d2-123456789abc'],
    })).rejects.toThrow(BadRequestException);

    expect(prismaMock.bookingService.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['67d3b1c2-12c9-4d8c-a1d2-123456789abc'] },
        bookingId: 'bk-remove',
        service: { isAddon: true },
      },
    });
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it('removes an existing add-on and recalculates the booking total', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'bk-remove-addon',
      petId: 'pet-1',
      status: BookingStatus.CONFIRMED,
      statusV2: 'BOOKED',
      discount: 1000,
    });
    prismaMock.bookingService.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.bookingService.findMany.mockResolvedValue([]);

    await service.updateAddons('bk-remove-addon', {
      removeBookingServiceIds: ['67d3b1c2-12c9-4d8c-a1d2-123456789abc'],
    });

    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'bk-remove-addon' },
      data: { subtotal: 0, total: 0 },
    });
  });

  it('does not allow changing V2 bookings through the legacy status endpoint', async () => {
    prismaMock.booking.findFirst.mockResolvedValue({
      id: 'bk-v2',
      status: BookingStatus.CONFIRMED,
      statusV2: 'BOOKED',
    });

    await expect(
      service.updateStatus('bk-v2', { status: BookingStatus.IN_PROGRESS }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it('allows a staff member to mark a booked V2 appointment as arrived', async () => {
    const booked = {
      id: 'bk-arrive',
      statusV2: 'BOOKED',
      startAt: new Date('2026-10-20T03:00:00.000Z'),
      customerId: 'customer-1',
    };
    const arrived = { ...booked, statusV2: 'ARRIVED' };
    prismaMock.booking.findUnique
      .mockResolvedValueOnce(booked)
      .mockResolvedValueOnce(arrived);
    prismaMock.shopSettings.findUnique.mockResolvedValue({ id: 'singleton' });
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    await service.changeStatusV2(
      'bk-arrive',
      { userId: 'staff-1', role: Role.STAFF },
      { fromStatus: 'BOOKED', toStatus: 'ARRIVED' },
    );

    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bk-arrive', statusV2: 'BOOKED' },
        data: expect.objectContaining({ statusV2: 'ARRIVED' }),
      }),
    );
    expect(prismaMock.bookingStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromStatus: 'BOOKED', toStatus: 'ARRIVED' }),
      }),
    );
  });

  it('allows a staff member to advance a V2 appointment when salon settings are absent', async () => {
    const booked = {
      id: 'bk-arrive-no-settings',
      statusV2: 'BOOKED',
      startAt: new Date('2026-10-20T03:00:00.000Z'),
      customerId: 'customer-1',
    };
    prismaMock.booking.findUnique
      .mockResolvedValueOnce(booked)
      .mockResolvedValueOnce({ ...booked, statusV2: 'ARRIVED' });
    prismaMock.shopSettings.findUnique.mockResolvedValue(null);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.changeStatusV2(
      'bk-arrive-no-settings',
      { userId: 'staff-1', role: Role.STAFF },
      { fromStatus: 'BOOKED', toStatus: 'ARRIVED' },
    );

    expect(result).toMatchObject({ statusV2: 'ARRIVED' });
  });

  it('starts an arrived appointment at the saved price without requiring another weight entry', async () => {
    const arrived = {
      id: 'bk-unchanged-weight',
      statusV2: 'ARRIVED',
      startAt: new Date('2026-11-01T03:00:00.000Z'),
      customerId: 'customer-1',
      petId: 'pet-1',
      subtotal: 350000,
      total: 350000,
    };
    prismaMock.booking.findUnique
      .mockResolvedValueOnce(arrived)
      .mockResolvedValueOnce({ ...arrived, statusV2: 'IN_SERVICE' });
    prismaMock.bookingStatusLog.findFirst = vi.fn().mockResolvedValue(null);
    prismaMock.petProfile.findUnique.mockResolvedValue({ weightKg: 5.1 });
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.changeStatusV2(
      arrived.id,
      { userId: 'staff-1', role: Role.STAFF },
      { fromStatus: 'ARRIVED', toStatus: 'IN_SERVICE' },
    )).resolves.toMatchObject({ statusV2: 'IN_SERVICE', subtotal: 350000, total: 350000 });
  });

  it('does not start service after a weight correction that the service cannot support', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'bk-unsupported-weight',
      statusV2: 'ARRIVED',
      startAt: new Date('2026-11-01T03:00:00.000Z'),
      customerId: 'customer-1',
      petId: 'pet-1',
    });
    prismaMock.bookingStatusLog.findFirst = vi.fn().mockResolvedValue({
      action: 'WEIGHT_RECHECK_UNSUPPORTED',
      createdAt: new Date(),
      meta: { weightKg: 21 },
    });
    prismaMock.petProfile.findUnique.mockResolvedValue({ weightKg: 21 });

    await expect(service.changeStatusV2(
      'bk-unsupported-weight',
      { userId: 'staff-1', role: Role.STAFF },
      { fromStatus: 'ARRIVED', toStatus: 'IN_SERVICE' },
    )).rejects.toThrow(BadRequestException);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it('still refuses a pet above 20 kg when its profile changed without a reweigh log', async () => {
    const arrived = {
      id: 'bk-profile-over-limit',
      statusV2: 'ARRIVED',
      petId: 'pet-1',
      startAt: new Date('2026-11-01T03:00:00.000Z'),
    };
    prismaMock.booking.findUnique.mockResolvedValue(arrived);
    prismaMock.bookingStatusLog.findFirst = vi.fn().mockResolvedValue(null);
    prismaMock.petProfile.findUnique.mockResolvedValue({ weightKg: 21 });
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.changeStatusV2(
      arrived.id,
      { userId: 'staff-1', role: Role.STAFF },
      { fromStatus: 'ARRIVED', toStatus: 'IN_SERVICE' },
    )).rejects.toThrow('20 kg');
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    { route: 'status', reason: undefined, expected: null },
    { route: 'cancel', reason: undefined, expected: null },
    { route: 'cancel', reason: '  Khách đổi kế hoạch.  ', expected: 'Khách đổi kế hoạch.' },
  ])('records the actual cancellation reason through $route instead of generating one: $expected', async ({ route, reason, expected }) => {
    const booked = {
      id: 'bk-cancellation-reason',
      statusV2: 'BOOKED',
      customerId: 'customer-1',
      startAt: new Date('2026-11-05T03:00:00.000Z'),
    };
    if (route === 'cancel') prismaMock.booking.findUnique.mockResolvedValueOnce(booked);
    prismaMock.booking.findUnique
      .mockResolvedValueOnce(booked)
      .mockResolvedValueOnce({ ...booked, statusV2: 'CANCELLED' })
      .mockResolvedValueOnce(null);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    if (route === 'cancel') {
      await service.cancel(booked.id, 'staff-1', Role.STAFF, reason);
    } else {
      await service.changeStatusV2(booked.id, { userId: 'staff-1', role: Role.STAFF }, {
        fromStatus: 'BOOKED', toStatus: 'CANCELLED', reason,
      });
    }

    expect(prismaMock.bookingStatusLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        bookingId: booked.id,
        toStatus: 'CANCELLED',
        staffId: 'staff-1',
        reason: expected,
      }),
    }));
  });

  it('does not reopen a cancelled V2 appointment through the normal status flow', async () => {
    await expect(
      service.changeStatusV2(
        'bk-cancelled',
        { userId: 'staff-1', role: Role.STAFF },
        { fromStatus: 'CANCELLED', toStatus: 'BOOKED' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not let staff mark an unpaid V2 booking as done without a final payment', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'bk-unpaid',
      customerId: 'customer-1',
      statusV2: 'READY_FOR_PICKUP',
      isPaid: false,
      total: 150000,
    });

    await expect(service.changeStatusV2(
      'bk-unpaid',
      { userId: 'staff-1', role: Role.STAFF },
      { fromStatus: 'READY_FOR_PICKUP', toStatus: 'DONE' },
    )).rejects.toThrow(BadRequestException);

    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it('explains an invalid legacy transition with Vietnamese status labels', async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce({ id: 'bk-invalid-step', status: BookingStatus.READY_FOR_PICKUP });
    await expect(service.updateStatus('bk-invalid-step', { status: BookingStatus.CONFIRMED }))
      .rejects.toThrow('Không thể chuyển lịch từ Chờ khách nhận sang Đã đặt.');
  });

  it('rejects direct transition from IN_PROGRESS to COMPLETED without READY_FOR_PICKUP', async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce({
      id: 'bk-4',
      status: BookingStatus.IN_PROGRESS,
    });

    await expect(service.updateStatus('bk-4', { status: BookingStatus.COMPLETED }))
      .rejects.toThrow(BadRequestException);
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it('requires an existing customer account for staff walk-in bookings', async () => {
    prismaMock.petProfile = { findUnique: vi.fn().mockResolvedValue({ id: 'pet-1', userId: 'user-1' }) };

    await expect(service.create('admin-id', 'ADMIN' as any, {
      type: 'SPA' as any,
      petId: 'pet-1',
      serviceIds: ['srv-addon-1'],
    })).rejects.toThrow('Vui lòng chọn tài khoản khách hàng trước khi tạo lịch.');

    expect(prismaMock.timeSlot.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it('replays a V2 booking for the same idempotency key before checking capacity again', async () => {
    const dto = { petId: 'pet-1', serviceIds: ['spa-1'], startAt: '2026-10-30T10:00:00+07:00' };
    const idempotencyKey = 'req-booking-000001';
    const existingBooking = {
      id: 'booking-idempotent',
      customerId: 'user-1',
      idempotencyHash: requestFingerprint('spa-booking-v2', 'user-1', dto),
    };
    prismaMock.booking.findUnique.mockImplementation(async ({ where }: any) =>
      where.idempotencyKey ? existingBooking : null,
    );

    const result = await (service.bookAppointmentTx as any)(
      { userId: 'user-1', role: Role.CUSTOMER },
      dto,
      undefined,
      undefined,
      idempotencyKey,
    );

    expect(result).toEqual(existingBooking);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
    expect(prismaMock.petProfile.findUnique).not.toHaveBeenCalled();
  });

  it('serializes concurrent V2 booking retries with the same idempotency key', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-30T01:00:00.000Z'));
    const dto = { petId: 'pet-1', serviceIds: ['spa-1'], startAt: '2026-10-30T10:00:00+07:00' };
    const idempotencyKey = 'req-booking-race-0001';
    let storedBooking: any = null;
    let idempotencyLockCalls = 0;
    let releaseFirstTransaction!: () => void;
    const firstTransactionDone = new Promise<void>((resolve) => { releaseFirstTransaction = resolve; });

    prismaMock.petProfile.findUnique.mockResolvedValue({
      id: 'pet-1', userId: 'user-1', name: 'Bông', species: 'DOG', weightKg: 3.5, archivedAt: null,
    });
    prismaMock.service.findFirst.mockResolvedValue(null);
    prismaMock.service.findMany.mockResolvedValue([{
      id: 'spa-1', isActive: true, category: ServiceCategory.BATH,
      priceTiers: [{ species: 'DOG', minWeight: 0, maxWeight: 5, price: 200000 }],
    }]);
    prismaMock.shopSettings.findUnique.mockResolvedValue({
      capacity: 3,
      webCapacity: null,
      minNoticeHours: 0,
      maxAdvanceDays: 90,
      slotStepMin: 30,
      spaBookingPromotionActive: false,
      holidays: [],
      openHours: { '5': { open: '08:30', close: '18:30' } },
    });
    prismaMock.sizeTier.findMany.mockResolvedValue([{ id: 'size-small', minKg: 0, maxKg: 5 }]);
    prismaMock.booking.count.mockResolvedValue(0);
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.booking.findUnique.mockImplementation(async ({ where }: any) =>
      where.idempotencyKey ? storedBooking : null,
    );
    prismaMock.booking.create.mockImplementation(async ({ data }: any) => {
      storedBooking = {
        id: 'booking-race',
        code: 'BK-RACE',
        customerId: 'user-1',
        pet: { id: 'pet-1', name: 'Bông' },
        customer: { id: 'user-1', email: null },
        startAt: new Date(dto.startAt),
        total: 200000,
        ...data,
      };
      return storedBooking;
    });
    prismaMock.notification = {
      create: vi.fn().mockImplementation(async () => { releaseFirstTransaction(); }),
    };
    prismaMock.$executeRaw.mockImplementation(async (_query: TemplateStringsArray, ...values: unknown[]) => {
      if (values.some((value) => typeof value === 'string' && value.startsWith('booking-create:'))) {
        idempotencyLockCalls += 1;
        if (idempotencyLockCalls > 1) await firstTransactionDone;
      }
      return 1;
    });

    try {
      const [first, retry] = await Promise.all([
        service.bookAppointmentTx({ userId: 'user-1', role: Role.CUSTOMER }, dto, undefined, undefined, idempotencyKey),
        service.bookAppointmentTx({ userId: 'user-1', role: Role.CUSTOMER }, dto, undefined, undefined, idempotencyKey),
      ]);

      expect(retry).toEqual(first);
      expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.notification.create).toHaveBeenCalledTimes(1);
      expect(idempotencyLockCalls).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('replays a legacy booking for the same idempotency key', async () => {
    const dto = { type: 'SPA' as any, petId: 'pet-1', serviceIds: ['spa-1'] };
    const idempotencyKey = 'req-booking-v1-0001';
    const existingBooking = {
      id: 'legacy-booking-idempotent',
      idempotencyHash: requestFingerprint('spa-booking-v1', 'user-1', { requesterRole: Role.CUSTOMER, dto }),
    };
    prismaMock.booking.findUnique.mockResolvedValue(existingBooking);

    const result = await service.create('user-1', Role.CUSTOMER, dto, idempotencyKey);

    expect(result).toEqual(existingBooking);
    expect(prismaMock.petProfile.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it('rejects staff appointments whose selected start time has already passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T02:00:00.000Z'));
    prismaMock.petProfile.findUnique.mockResolvedValue({ id: 'pet-1', userId: 'user-1' });

    try {
      await expect(service.bookAppointmentTx(
        { userId: 'user-1', role: Role.CUSTOMER },
        { petId: 'pet-1', serviceIds: ['spa-1'], startAt: '2026-10-27T09:00:00+07:00' },
      )).rejects.toThrow('Giờ hẹn đã qua');

      expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects unsupported booking types before doing any work', async () => {
    await expect(service.create('user-1', Role.CUSTOMER, {
      type: 'UNSUPPORTED' as any,
      petId: 'pet-1',
      serviceIds: ['unsupported-service'],
    })).rejects.toThrow('Loại lịch hẹn không hợp lệ.');
    expect(prismaMock.petProfile.findUnique).not.toHaveBeenCalled();
  });
});
