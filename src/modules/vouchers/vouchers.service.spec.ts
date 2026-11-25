import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VouchersService } from './vouchers.service.js';

describe('Voucher availability message', () => {
  const validVoucher = { id: 'voucher-1', code: 'SAVE10', title: 'Giảm 10%', isActive: true, expiryDate: new Date('2099-12-31'), minSpend: 0, usageLimit: -1, usageCount: 0, usageLimitPerUser: 1, pointCost: null, discountType: 'PERCENTAGE', discountValue: 10, maxDiscount: null };

  it.each([
    { name: 'unknown code', voucher: null },
    { name: 'suspended voucher', voucher: { ...validVoucher, isActive: false } },
    { name: 'expired voucher', voucher: { ...validVoucher, expiryDate: new Date('2000-01-01') } },
    { name: 'minimum not met', voucher: { ...validVoucher, minSpend: 500000 } },
    { name: 'global limit reached', voucher: { ...validVoucher, usageLimit: 1, usageCount: 1 } },
    { name: 'reward not in wallet', voucher: { ...validVoucher, pointCost: 100 } },
    { name: 'account limit reached', voucher: validVoucher, usageCount: 1 },
  ])('uses one message for $name', async ({ voucher, usageCount }) => {
    const prisma = { voucher: { findUnique: vi.fn().mockResolvedValue(voucher) }, voucherUsage: { findFirst: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(usageCount ?? 0) } };
    const service = new VouchersService(prisma as any);

    await expect(service.validate('SAVE10', 'user-1', 100000)).rejects.toThrow('Voucher không khả dụng.');
  });
});

describe('VouchersService.redeem', () => {
  let service: VouchersService;
  let transaction: any;

  beforeEach(() => {
    transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'voucher-1' }]),
      voucher: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'voucher-1',
          code: 'LAST-REWARD',
          title: 'Voucher cuối',
          isActive: true,
          pointCost: 100,
          expiryDate: new Date('2099-12-31T23:59:59.999Z'),
          usageLimit: 1,
          usageCount: 1,
        }),
      },
      voucherUsage: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'usage-1',
          voucher: {
            id: 'voucher-1',
            code: 'LAST-REWARD',
            title: 'Voucher cuối',
            expiryDate: new Date('2099-12-31T23:59:59.999Z'),
          },
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user-1', loyaltyPoints: 500 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      loyaltyTransaction: {
        create: vi.fn().mockResolvedValue({ id: 'loyalty-transaction-1' }),
      },
    };

    const prisma = {
      $transaction: vi.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    };
    service = new VouchersService(prisma as any);
  });

  it('does not debit points or issue a wallet voucher when the global limit is already reached', async () => {
    await expect(service.redeem('user-1', 'LAST-REWARD')).rejects.toThrow(BadRequestException);

    expect(transaction.user.findUnique).not.toHaveBeenCalled();
    expect(transaction.user.updateMany).not.toHaveBeenCalled();
    expect(transaction.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(transaction.voucherUsage.create).not.toHaveBeenCalled();
  });
});
