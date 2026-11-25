import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServiceCategory } from '@prisma/client';
import { ServicesService } from './services.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('ServicesService', () => {
  let service: ServicesService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      service: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
      bookingService: {
        findFirst: vi.fn(),
      },
      servicePriceTier: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      servicePrice: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(async (ops) =>
        typeof ops === 'function' ? ops(prismaMock) : Promise.all(ops),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('supported catalog categories', () => {
    const categories = ['BATH', 'GROOMING', 'CAT_SPA'];

    beforeEach(() => {
      const rows = [
        { id: 'spa-1', slug: 'spa', category: 'BATH', priceTiers: [] },
        { id: 'retired-1', slug: 'retired', category: 'RETIRED', priceTiers: [] },
      ];
      prismaMock.service.findMany.mockImplementation(async ({ where }: any) =>
        rows.filter(row => where.category?.in?.includes(row.category)),
      );
      prismaMock.service.findFirst.mockImplementation(async ({ where }: any) =>
        rows.find(row => where.category?.in?.includes(row.category) &&
          where.OR?.some((key: any) => key.id === row.id || key.slug === row.slug)) ?? null,
      );
    });

    it('returns only supported services from a database with retired catalog records', async () => {
      expect((await service.findAll()).map(row => row.id)).toEqual(['spa-1']);
      expect(prismaMock.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ category: { in: categories } }),
      }));
    });

    it('keeps retired catalog records out of the administration list', async () => {
      expect((await service.findAllForAdmin()).map(row => row.id)).toEqual(['spa-1']);
    });

    it('does not open a retired record by its direct slug', async () => {
      await expect(service.findBySlug('retired')).rejects.toThrow(NotFoundException);
      await expect(service.findBySlug('spa')).resolves.toMatchObject({ id: 'spa-1' });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if service does not exist', async () => {
      prismaMock.service.findUnique.mockResolvedValue(null);
      await expect(service.remove('srv-not-found')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if service has active bookings', async () => {
      prismaMock.service.findUnique.mockResolvedValue({ id: 'srv-1', name: 'Spa' });
      prismaMock.bookingService.findFirst.mockResolvedValue({ id: 'bs-1', serviceId: 'srv-1' });

      await expect(service.remove('srv-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete service if no active bookings exist', async () => {
      prismaMock.service.findUnique.mockResolvedValue({ id: 'srv-1', name: 'Spa' });
      prismaMock.bookingService.findFirst.mockResolvedValue(null);
      prismaMock.service.delete.mockResolvedValue({ id: 'srv-1' });

      const res = await service.remove('srv-1');
      expect(res.message).toBe('Đã xóa dịch vụ chưa phát sinh booking.');
      expect(prismaMock.servicePrice.deleteMany).toHaveBeenCalledWith({ where: { serviceId: 'srv-1' } });
      expect(prismaMock.service.delete).toHaveBeenCalledWith({ where: { id: 'srv-1' } });
    });
  });

  describe('setPriceTiers', () => {
    it('should replace price tiers in a single transaction', async () => {
      prismaMock.service.findUnique.mockResolvedValue({ id: 'srv-1' });
      prismaMock.service.findUnique.mockResolvedValueOnce({ id: 'srv-1' })
        .mockResolvedValueOnce({
          id: 'srv-1',
          name: 'Spa',
          priceTiers: [{
            id: 'pt-1',
            label: 'Dưới 5kg',
            minWeight: 0,
            maxWeight: 5,
            price: 200000,
            species: null,
          }],
        });

      const newTiers = [
        { label: 'Dưới 5kg', minWeight: 0, maxWeight: 5, price: 200000 },
        { label: '5-10kg', minWeight: 5, maxWeight: 10, price: 250000 },
        { label: '10-15kg', minWeight: 10, maxWeight: 15, price: 300000 },
        { label: '15-20kg', minWeight: 15, maxWeight: 20, price: 350000 },
      ];

      await service.setPriceTiers('srv-1', { priceTiers: newTiers });
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it.each([
      { priceTiers: [{ label: 'Sai khoảng', minWeight: 0, maxWeight: 5, price: 1 }, { label: 'Chồng', minWeight: 4, maxWeight: 10, price: 1 }] },
      { priceTiers: [{ label: 'Thiếu khoảng', minWeight: 0, maxWeight: 5, price: 1 }, { label: 'Hở', minWeight: 6, maxWeight: 10, price: 1 }] },
      { priceTiers: [{ label: 'Min >= Max', minWeight: 5, maxWeight: 5, price: 1 }] },
    ])('rejects invalid tier ranges without replacing stored prices', async ({ priceTiers }) => {
      prismaMock.service.findUnique.mockResolvedValue({ id: 'srv-1' });
      await expect(service.setPriceTiers('srv-1', { priceTiers } as any)).rejects.toThrow(BadRequestException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('calculatePrice', () => {
    const priceTiers = [
      { id: 'small', serviceId: 'srv-1', minWeight: 0, maxWeight: 5, price: 100000, label: 'Dưới 5kg', species: null },
      { id: 'medium', serviceId: 'srv-1', minWeight: 5, maxWeight: 10, price: 200000, label: '5-10kg', species: null },
      { id: 'large', serviceId: 'srv-1', minWeight: 10, maxWeight: 20, price: 300000, label: '10-20kg', species: null },
    ];

    beforeEach(() => {
      prismaMock.service.findFirst.mockResolvedValue({
        id: 'srv-1', name: 'Spa', category: ServiceCategory.BATH, isAddon: false, priceTiers,
      });
    });

    it.each([
      [0, 100000], [4.9, 100000], [5, 200000], [5.1, 200000],
      [9.9, 200000], [10, 300000], [19.9, 300000], [20, 300000],
    ])('uses exactly one correct tier for %s kg', async (weight, expectedPrice) => {
      const result = await service.calculatePrice('srv-1', undefined, weight as number);
      expect(result.priceApplied).toBe(expectedPrice);
    });

    it.each([-0.1, 20.1])('rejects out-of-range weight %s kg', async (weight) => {
      await expect(service.calculatePrice('srv-1', undefined, weight)).rejects.toThrow(BadRequestException);
    });

    it('rejects overlapping tiers instead of choosing whichever happens to be first', async () => {
      prismaMock.service.findFirst.mockResolvedValue({
        id: 'srv-1', name: 'Spa', category: ServiceCategory.BATH, isAddon: false, priceTiers: [
          { ...priceTiers[0], maxWeight: 6 }, priceTiers[1], ...priceTiers.slice(2),
        ],
      });
      await expect(service.calculatePrice('srv-1', undefined, 5.5)).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('rejects an uncovered/overlapping price table before writing', async () => {
      await expect(service.create({
        name: 'Spa', slug: 'spa', tagline: 'Tagline', description: 'Description',
        category: ServiceCategory.BATH, durationMin: 60,
        priceTiers: [
          { label: '0-5', minWeight: 0, maxWeight: 5, price: 100000 },
          { label: '6-10', minWeight: 6, maxWeight: 10, price: 200000 },
        ],
      })).rejects.toThrow(BadRequestException);
      expect(prismaMock.service.create).not.toHaveBeenCalled();
    });
  });
});
