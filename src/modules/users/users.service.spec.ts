import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('UsersService - Role Management & Points Adjustment', () => {
  let service: UsersService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      loyaltyTransaction: {
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      notification: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateRole', () => {
    it('should throw ConflictException if admin attempts to change own role', async () => {
      await expect(
        service.updateRole('admin-1', 'admin-1', Role.STAFF, Role.ADMIN),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully update target user role', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'target-1', role: Role.CUSTOMER });
      prismaMock.user.update.mockResolvedValue({ id: 'target-1', role: Role.STAFF });

      const updated = await service.updateRole('admin-1', 'target-1', Role.STAFF, Role.ADMIN);
      expect(updated.role).toBe(Role.STAFF);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'target-1' },
          data: { role: Role.STAFF },
        }),
      );
    });

    it('should reject staff from changing any account role', async () => {
      await expect(
        service.updateRole('staff-1', 'target-1', Role.STAFF, Role.STAFF),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('should reject staff from changing the role of an admin account', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'admin-target', role: Role.ADMIN });

      await expect(
        service.updateRole('staff-1', 'admin-target', Role.STAFF, Role.STAFF),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should allow an admin to promote a customer to admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'target-1', role: Role.CUSTOMER });
      prismaMock.user.update.mockResolvedValue({ id: 'target-1', role: Role.ADMIN });

      const updated = await service.updateRole('admin-1', 'target-1', Role.ADMIN, Role.ADMIN);

      expect(updated.role).toBe(Role.ADMIN);
    });
  });

  describe('adjustPoints', () => {
    it('should successfully add points and record LoyaltyTransaction EARN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'target-1', loyaltyPoints: 100 });
      prismaMock.user.update.mockResolvedValue({ id: 'target-1', loyaltyPoints: 150 });

      await service.adjustPoints('admin-1', 'target-1', 50, 'Thưởng sinh nhật khách hàng');

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'target-1' },
          data: { loyaltyPoints: 150 },
        }),
      );
      expect(prismaMock.loyaltyTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'target-1',
            amount: 50,
            type: 'EARN',
            description: '[Nội bộ điều chỉnh] Thưởng sinh nhật khách hàng',
          }),
        }),
      );
    });

    it('should throw BadRequestException if subtracting more points than balance', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'target-1', loyaltyPoints: 30 });

      await expect(
        service.adjustPoints('admin-1', 'target-1', -50, 'Thu hồi điểm'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
