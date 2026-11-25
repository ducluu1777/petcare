import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BehavioralFlag, BookingStatus, Role, Species } from '@prisma/client';
import { PetsService } from './pets.service.js';

// minimal mock for PrismaService
const mockPrisma = {
  petProfile: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  booking: {
    findFirst: vi.fn(),
  },
};

describe('PetsService', () => {
  let service: PetsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PetsService(mockPrisma as any);
  });

  describe('create', () => {
    it('creates a pet and calculates nextSpaDate for Poodle (~28 days)', async () => {
      const dto = { name: 'Milo', species: Species.DOG, breed: 'Poodle', weightKg: 3 };
      mockPrisma.petProfile.create.mockResolvedValue({ id: '1', ...dto });

      await service.create('user-1', dto as any);

      const callArg = mockPrisma.petProfile.create.mock.calls[0][0].data;
      const nextSpa = new Date(callArg.nextSpaDate);
      const diffDays = Math.round((nextSpa.getTime() - Date.now()) / 86400000);

      expect(diffDays).toBeGreaterThanOrEqual(27);
      expect(diffDays).toBeLessThanOrEqual(29);
    });

    it('calculates nextSpaDate ~56 days for Golden', async () => {
      const dto = { name: 'Lucky', species: Species.DOG, breed: 'Golden Retriever', weightKg: 28 };
      mockPrisma.petProfile.create.mockResolvedValue({ id: '2', ...dto });

      await service.create('user-1', dto as any);

      const callArg = mockPrisma.petProfile.create.mock.calls[0][0].data;
      const nextSpa = new Date(callArg.nextSpaDate);
      const diffDays = Math.round((nextSpa.getTime() - Date.now()) / 86400000);

      expect(diffDays).toBeGreaterThanOrEqual(55);
      expect(diffDays).toBeLessThanOrEqual(57);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when pet not found', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue(null);
      await expect(service.findById('x', 'user-1', Role.CUSTOMER)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when customer views someone elses pet', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue({ id: '1', userId: 'other-user' });
      await expect(service.findById('1', 'user-1', Role.CUSTOMER)).rejects.toThrow(ForbiddenException);
    });

    it('allows staff to view any pet', async () => {
      const pet = { id: '1', userId: 'other-user' };
      mockPrisma.petProfile.findUnique.mockResolvedValue(pet);
      const result = await service.findById('1', 'staff-1', Role.STAFF);
      expect(result).toEqual(pet);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when pet does not exist', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.update('non-existent', 'user-1', Role.CUSTOMER, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when customer updates another users pet', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue({ id: '1', userId: 'other-user' });
      await expect(
        service.update('1', 'user-1', Role.CUSTOMER, { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows staff or admin to update any pet', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue({ id: '1', userId: 'other-user' });
      mockPrisma.petProfile.update.mockResolvedValue({ id: '1', name: 'Updated by Staff' });

      const res = await service.update('1', 'staff-1', Role.STAFF, { name: 'Updated by Staff' });
      expect(res.name).toBe('Updated by Staff');
    });

    it('recalculates nextSpaDate when breed is updated', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue({ id: '1', userId: 'user-1' });
      mockPrisma.petProfile.update.mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));

      await service.update('1', 'user-1', Role.CUSTOMER, {
        breed: 'Poodle',
        weightKg: 4.0,
      });

      expect(mockPrisma.petProfile.update).toHaveBeenCalled();
      const updateData = mockPrisma.petProfile.update.mock.calls[0][0].data;
      expect(updateData.breed).toBe('Poodle');
      expect(updateData.nextSpaDate).toBeDefined();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when pet does not exist', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue(null);
      await expect(service.remove('x', 'user-1', Role.CUSTOMER)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when customer deletes another users pet', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue({ id: '1', userId: 'other-user' });
      await expect(service.remove('1', 'user-1', Role.CUSTOMER)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when active booking exists', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue({ id: '1', userId: 'user-1' });
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'b1', status: BookingStatus.CONFIRMED });

      await expect(service.remove('1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('deletes pet when no active booking', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue({ id: '1', userId: 'user-1' });
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      mockPrisma.petProfile.delete.mockResolvedValue({});

      const result = await service.remove('1', 'user-1');
      expect(result.message).toBe('Đã xóa vĩnh viễn hồ sơ thú cưng.');
    });
  });

  describe('setBehavioralFlag', () => {
    it('updates behavioral flag', async () => {
      mockPrisma.petProfile.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.petProfile.update.mockResolvedValue({ id: '1', behavioralFlag: BehavioralFlag.AGGRESSIVE });

      const result = await service.setBehavioralFlag('1', BehavioralFlag.AGGRESSIVE);
      expect(result.behavioralFlag).toBe(BehavioralFlag.AGGRESSIVE);
    });
  });
});
