import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { isVoucherExpired, normalizeVoucherExpiry } from '../vouchers/voucher-expiry.js';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getHistory(userId: string) {
    return this.prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true, name: true },
    });

    if (!user) return null;

    return {
      name: user.name,
      loyaltyPoints: user.loyaltyPoints,
    };
  }

  /** Tra cứu tại quầy: tìm bằng SĐT → trả tên, điểm và voucher khả dụng */
  async lookup(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, phone: true, loyaltyPoints: true },
    });

    if (!user) return null;

    const usedIds = (
      await this.prisma.voucherUsage.findMany({ where: { userId: user.id }, select: { voucherId: true } })
    ).map((u) => u.voucherId);

    const vouchers = await this.prisma.voucher.findMany({
      where: {
        isActive: true,
        id: { notIn: usedIds },
      },
    });
    const now = new Date();
    const availableVouchers = vouchers
      .map(normalizeVoucherExpiry)
      .filter((voucher) => !isVoucherExpired(voucher.expiryDate, now));

    return {
      ...user,
      availableVouchers,
    };
  }
}
