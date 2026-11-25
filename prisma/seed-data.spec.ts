import { describe, expect, it } from 'vitest';

import {
  deliveryAreaSeeds,
  productSeeds,
  serviceSeeds,
  shopOpenHours,
  sizeTierSeeds,
  voucherSeeds,
} from './seed-data.js';

describe('demo seed catalog', () => {
  it('defines the requested number of demo services, products, delivery areas, and vouchers', () => {
    expect(serviceSeeds).toHaveLength(11);
    expect(productSeeds.length).toBeGreaterThanOrEqual(18);
    expect(productSeeds.length).toBeLessThanOrEqual(30);
    expect(deliveryAreaSeeds.length).toBeGreaterThanOrEqual(8);
    expect(deliveryAreaSeeds.length).toBeLessThanOrEqual(15);
    expect(voucherSeeds.length).toBeGreaterThanOrEqual(3);
    expect(voucherSeeds.length).toBeLessThanOrEqual(6);
  });

  it('uses unique slugs and offers four size-based prices for every active service', () => {
    expect(new Set(serviceSeeds.map(({ slug }) => slug)).size).toBe(
      serviceSeeds.length,
    );
    expect(sizeTierSeeds.map(({ sortOrder }) => sortOrder)).toEqual([
      1, 2, 3, 4,
    ]);

    for (const service of serviceSeeds) {
      expect(service.slug).toMatch(/^demo-/);
      expect(service.description).toMatch(/^\[DEMO\]/);
      expect(service.isActive).toBe(true);
      expect(service.prices).toHaveLength(sizeTierSeeds.length);
      expect(service.durations).toHaveLength(sizeTierSeeds.length);
      expect(service.prices.every((price) => price > 0)).toBe(true);
      expect(service.durations.every((duration) => duration > 0)).toBe(true);
    }
  });

  it('gives each product demo-only descriptions, stock, and at least two specifications', () => {
    expect(new Set(productSeeds.map(({ slug }) => slug)).size).toBe(
      productSeeds.length,
    );

    for (const product of productSeeds) {
      expect(product.slug).toMatch(/^demo-/);
      expect(product.description).toMatch(/^\[DEMO\]/);
      expect(product.stock).toBeGreaterThan(0);
      expect(product.reservedStock).toBe(0);
      expect(product.rating).toBeGreaterThanOrEqual(4);
      expect(product.rating).toBeLessThanOrEqual(5);
      expect(product.reviewCount).toBe(0);
      expect(product.specifications.length).toBeGreaterThanOrEqual(2);
      expect(product.specifications.length).toBeLessThanOrEqual(4);
    }
  });

  it('uses unique delivery keys, includes free and paid areas, and configures all seven days', () => {
    const deliveryKeys = deliveryAreaSeeds.map(
      ({ provinceKey, wardKey }) => `${provinceKey}:${wardKey}`,
    );

    expect(new Set(deliveryKeys).size).toBe(deliveryKeys.length);
    expect(deliveryAreaSeeds.some(({ fee }) => fee === 0)).toBe(true);
    expect(deliveryAreaSeeds.some(({ fee }) => fee > 0)).toBe(true);
    expect(Object.keys(shopOpenHours).sort()).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
  });

  it('uses unique demo voucher codes with supported discount types', () => {
    expect(new Set(voucherSeeds.map(({ code }) => code)).size).toBe(
      voucherSeeds.length,
    );
    expect(voucherSeeds.every(({ code }) => /^DEMO[A-Z0-9]+$/.test(code))).toBe(
      true,
    );
    expect(
      new Set(voucherSeeds.map(({ discountType }) => discountType)),
    ).toEqual(new Set(['PERCENTAGE', 'FIXED']));
    expect(
      voucherSeeds.find(({ code }) => code === 'DEMOTAMBUU200K')?.discountValue,
    ).toBe(200000);
  });
});
