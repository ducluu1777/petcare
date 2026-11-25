import { Test } from '@nestjs/testing';
import { Species } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ProductsService } from './products.service.js';

describe('ProductsService recommendations', () => {
  let service: ProductsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = { product: { findMany: vi.fn() } };
    const module = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ProductsService);
  });

  it('combines species and weight criteria rather than letting one override the other', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    await service.recommend(Species.DOG, 4.5);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ suitableSpecies: Species.DOG }, { suitableSpecies: null }] },
          { OR: [
            { AND: [{ minWeightKg: { lte: 4.5 } }, { maxWeightKg: { gte: 4.5 } }] },
            { AND: [{ minWeightKg: null }, { maxWeightKg: null }] },
          ] },
        ],
        isActive: true,
      },
    });
  });
});
