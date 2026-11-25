import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { UpdateVoucherDto } from './dto/update-voucher.dto.js';
import { isVoucherExpired, normalizeVoucherExpiry, parseVoucherExpiryDate } from './voucher-expiry.js';
import { VOUCHER_UNAVAILABLE_MESSAGE } from './voucher-messages.js';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  async findRewards() {
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        isActive: true,
        pointCost: { not: null },
      },
      orderBy: { pointCost: 'asc' },
    });
    const now = new Date();
    return vouchers
      .map(normalizeVoucherExpiry)
      .filter((voucher) => !isVoucherExpired(voucher.expiryDate, now));
  }

  async findMyVouchers(userId: string) {
    // 1. Voucher đổi bằng điểm mà user đã redeem nhưng CHƯA dùng (bookingId null và orderId null)
    const unspentRedeemed = await this.prisma.voucherUsage.findMany({
      where: {
        userId,
        bookingId: null,
        orderId: null,
      },
      include: { voucher: true },
    });
    const now = new Date();
    const unspentVouchers = unspentRedeemed
      .map((u) => u.voucher)
      .map(normalizeVoucherExpiry)
      .filter((v) => v.isActive && !isVoucherExpired(v.expiryDate, now) && (v.usageLimit === -1 || v.usageCount < v.usageLimit));

    // Đếm lượt mã công khai theo tài khoản trên cả booking và đơn hàng.
    const publicVoucherUsage = (
      await this.prisma.voucherUsage.findMany({
        where: {
          userId,
          OR: [{ bookingId: { not: null } }, { orderId: { not: null } }],
        },
        select: { voucherId: true },
      })
    );
    const usageCountByVoucherId = new Map<string, number>();
    for (const usage of publicVoucherUsage) {
      usageCountByVoucherId.set(usage.voucherId, (usageCountByVoucherId.get(usage.voucherId) ?? 0) + 1);
    }

    const publicVouchers = await this.prisma.voucher.findMany({
      where: {
        isActive: true,
        pointCost: null,
      },
      orderBy: { expiryDate: 'asc' },
    });

    return [
      ...unspentVouchers,
      ...publicVouchers
        .map(normalizeVoucherExpiry)
        .filter((v) => {
          const accountUsageCount = usageCountByVoucherId.get(v.id) ?? 0;
          const hasAccountUsesLeft = v.usageLimitPerUser === -1 || accountUsageCount < v.usageLimitPerUser;
          return !isVoucherExpired(v.expiryDate, now)
            && (v.usageLimit === -1 || v.usageCount < v.usageLimit)
            && hasAccountUsesLeft;
        }),
    ];
  }

  async findVouchersForCustomer(userId: string) {
    const customer = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.CUSTOMER, isActive: true },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Không tìm thấy tài khoản khách hàng đang hoạt động.');
    return this.findMyVouchers(userId);
  }

  async validate(code: string, userId: string, orderTotal: number) {
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });

    if (!voucher || !voucher.isActive) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
    if (isVoucherExpired(voucher.expiryDate)) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
    if (voucher.minSpend > orderTotal) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
    if (voucher.usageLimit !== -1 && voucher.usageCount >= voucher.usageLimit) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);

    if (voucher.pointCost !== null && voucher.pointCost !== undefined) {
      const unspent = await this.prisma.voucherUsage.findFirst({
        where: {
          voucherId: voucher.id,
          userId,
          bookingId: null,
          orderId: null,
        },
      });
      if (!unspent) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
    } else if (voucher.usageLimitPerUser !== -1) {
      const accountUsageCount = await this.prisma.voucherUsage.count({
        where: {
          voucherId: voucher.id,
          userId,
          OR: [{ bookingId: { not: null } }, { orderId: { not: null } }],
        },
      });
      if (accountUsageCount >= voucher.usageLimitPerUser) {
        throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }
    }

    let discount = 0;
    if (voucher.discountType === DiscountType.PERCENTAGE) {
      discount = Math.round(orderTotal * voucher.discountValue / 100);
      if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
    } else {
      discount = voucher.discountValue;
    }

    return {
      valid: true,
      voucherId: voucher.id,
      code: voucher.code,
      title: voucher.title,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discount,
      totalAfterDiscount: Math.max(0, orderTotal - discount),
    };
  }

  async redeem(userId: string, voucherCode: string) {
    const usage = await this.prisma.$transaction(async (tx) => {
      const matchingVouchers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "vouchers" WHERE "code" = ${voucherCode} FOR UPDATE
      `;
      if (matchingVouchers.length === 0) {
        throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }

      const voucher = await tx.voucher.findUnique({ where: { id: matchingVouchers[0].id } });
      if (!voucher || !voucher.isActive || !voucher.pointCost) {
        throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }
      if (isVoucherExpired(voucher.expiryDate)) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      if (voucher.usageLimit !== -1 && voucher.usageCount >= voucher.usageLimit) {
        throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }

      const existingUnspent = await tx.voucherUsage.findFirst({
        where: { voucherId: voucher.id, userId, bookingId: null, orderId: null },
      });
      if (existingUnspent) {
        throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }

      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Không tìm thấy người dùng.');
      if (user.loyaltyPoints < voucher.pointCost) {
        throw new BadRequestException(`Cần ${voucher.pointCost} điểm. Bạn có ${user.loyaltyPoints} điểm.`);
      }

      const pointsDebited = await tx.user.updateMany({
        where: { id: userId, loyaltyPoints: { gte: voucher.pointCost } },
        data: { loyaltyPoints: { decrement: voucher.pointCost } },
      });
      if (pointsDebited.count !== 1) {
        throw new BadRequestException('Số điểm vừa thay đổi. Hãy tải lại rồi thử đổi voucher lần nữa.');
      }

      await tx.loyaltyTransaction.create({
        data: {
          userId,
          amount: -voucher.pointCost!,
          type: 'REDEEM',
          description: `Đổi ${voucher.pointCost} điểm lấy voucher ${voucher.code} (${voucher.title})`,
          refId: voucher.id,
        },
      });

      return tx.voucherUsage.create({
        data: {
          voucherId: voucher.id,
          userId,
          bookingId: null,
          orderId: null,
          usedAt: new Date(),
        },
        include: { voucher: true },
      });
    });
    return {
      ...usage,
      voucher: normalizeVoucherExpiry(usage.voucher),
    };
  }

  async findAll() {
    const vouchers = await this.prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });
    return vouchers.map(normalizeVoucherExpiry);
  }

  async create(dto: {
    code: string;
    title: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscount?: number;
    minSpend: number;
    pointCost?: number;
    expiryDate: string | Date;
    usageLimit?: number;
    usageLimitPerUser?: number;
  }) {
    const existing = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
    if (existing) throw new BadRequestException('Mã voucher đã tồn tại.');
    if (dto.pointCost == null && dto.usageLimitPerUser !== 1 && dto.usageLimitPerUser !== -1) {
      throw new BadRequestException('Chọn voucher công khai dùng một lần hoặc nhiều lần cho mỗi tài khoản.');
    }
    const voucher = await this.prisma.voucher.create({
      data: {
        ...dto,
        expiryDate: parseVoucherExpiryDate(dto.expiryDate),
        usageLimit: dto.usageLimit ?? -1,
        usageLimitPerUser: dto.pointCost == null ? dto.usageLimitPerUser! : 1,
      },
    });
    return normalizeVoucherExpiry(voucher);
  }

  async update(id: string, dto: UpdateVoucherDto) {
    const v = await this.prisma.voucher.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Không tìm thấy voucher.');
    if (dto.usageLimit !== undefined && dto.usageLimit !== -1 &&
      (!Number.isInteger(dto.usageLimit) || dto.usageLimit < 1)) {
      throw new BadRequestException('Giới hạn lượt phải từ 1 trở lên hoặc không giới hạn.');
    }
    if (dto.usageLimit !== undefined && dto.usageLimit !== -1 && dto.usageLimit < v.usageCount) {
      throw new BadRequestException('Giới hạn lượt không thể thấp hơn số lượt đã sử dụng.');
    }
    const data = {
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.expiryDate !== undefined ? { expiryDate: parseVoucherExpiryDate(dto.expiryDate) } : {}),
      ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
      ...(dto.usageLimitPerUser !== undefined ? { usageLimitPerUser: dto.usageLimitPerUser } : {}),
    };
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Chọn ít nhất một thông tin được phép cập nhật.');
    }
    const updatedVoucher = await this.prisma.voucher.update({ where: { id }, data });
    return normalizeVoucherExpiry(updatedVoucher);
  }
}
