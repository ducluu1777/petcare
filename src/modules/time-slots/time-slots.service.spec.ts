import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { TimeSlotsService } from './time-slots.service.js';
import { validate } from 'class-validator';
import { CreateSingleSlotDto } from './dto/time-slot.dto.js';

describe('TimeSlotsService', () => {
  let service: TimeSlotsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      timeSlot: { findMany: vi.fn(), findUnique: vi.fn(), createMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
      booking: { count: vi.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [TimeSlotsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TimeSlotsService);
  });

  it('returns only configured available slots without creating defaults', async () => {
    prisma.timeSlot.findMany.mockResolvedValue([{ id: 'open', booked: 1, capacity: 3 }, { id: 'full', booked: 2, capacity: 2 }]);
    await expect(service.findExistingAvailableByDate('2026-10-20')).resolves.toEqual({
      configured: true,
      slots: [{ id: 'open', booked: 1, capacity: 3 }],
    });
    expect(prisma.timeSlot.createMany).not.toHaveBeenCalled();
  });

  it('distinguishes a date with no configured slots from a full day', async () => {
    prisma.timeSlot.findMany.mockResolvedValue([]);
    await expect(service.findExistingAvailableByDate('2026-10-20')).resolves.toEqual({ configured: false, slots: [] });
    expect(prisma.timeSlot.createMany).not.toHaveBeenCalled();
  });

  it('lists all slots in an admin date range, including full slots', async () => {
    const slots = [{ id: 'full', booked: 4, capacity: 4 }];
    prisma.timeSlot.findMany.mockResolvedValue(slots);
    await expect(service.findAdminRange('2026-10-20', '2026-10-21')).resolves.toBe(slots);
    expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { slotDate: { gte: new Date('2026-10-20T00:00:00.000Z'), lte: new Date('2026-10-21T00:00:00.000Z') } },
    }));
  });

  it('rejects an invalid or inverted date range', async () => {
    await expect(service.findAdminRange('2026-10-22', '2026-10-21')).rejects.toThrow(BadRequestException);
    await expect(service.findAdminRange('not-a-date', '2026-10-21')).rejects.toThrow(BadRequestException);
    expect(prisma.timeSlot.findMany).not.toHaveBeenCalled();
  });

  it('deletes a slot with no bookings', async () => {
    prisma.timeSlot.findUnique.mockResolvedValue({ id: 'empty-slot' });
    prisma.booking.count.mockResolvedValue(0);
    prisma.timeSlot.delete.mockResolvedValue({ id: 'empty-slot' });
    await expect(service.remove('empty-slot')).resolves.toEqual({ message: 'Đã xóa khung giờ.' });
  });

  it('prevents deleting a slot referenced by bookings', async () => {
    prisma.timeSlot.findUnique.mockResolvedValue({ id: 'used-slot' });
    prisma.booking.count.mockResolvedValue(1);
    await expect(service.remove('used-slot')).rejects.toThrow(ConflictException);
    expect(prisma.timeSlot.delete).not.toHaveBeenCalled();
  });

  it('returns not found when deleting a missing slot', async () => {
    prisma.timeSlot.findUnique.mockResolvedValue(null);
    await expect(service.remove('missing-slot')).rejects.toThrow(NotFoundException);
  });

  it('does not lower a slot capacity below its current bookings', async () => {
    prisma.timeSlot.findUnique.mockResolvedValue({ id: 'busy-slot', booked: 3, capacity: 4 });
    await expect(service.update('busy-slot', { capacity: 2 })).rejects.toThrow(ConflictException);
    expect(prisma.timeSlot.update).not.toHaveBeenCalled();
  });
});

describe('CreateSingleSlotDto validation', () => {
  it('accepts date-only and valid 24-hour times', async () => {
    const dto = Object.assign(new CreateSingleSlotDto(), {
      slotDate: '2026-10-20', slotTime: '08:30', period: 'MORNING', capacity: 4,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects timestamps and malformed clock values', async () => {
    const dto = Object.assign(new CreateSingleSlotDto(), {
      slotDate: '2026-10-20T08:30:00Z', slotTime: '25:90', period: 'MORNING', capacity: 4,
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'slotDate')).toBe(true);
    expect(errors.some((error) => error.property === 'slotTime')).toBe(true);
  });
});
