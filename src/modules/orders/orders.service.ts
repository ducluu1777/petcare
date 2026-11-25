import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { BookingPaymentIntentStatus, DiscountType, FulfillmentMethod, OrderSource, OrderStatus, PaymentMethod, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MailService } from '../../common/mail/mail.service.js';
import { PaymentService } from '../payment/payment.service.js';
import { generatePaymentCode } from '../payment/payment-code.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreateInStoreSaleDto } from './dto/create-in-store-sale.dto.js';
import { ConfirmBankTransferDto } from '../payment/dto/confirm-bank-transfer.dto.js';
import { buildTransferPaymentNote, normalizeTransferReferences, reserveTransferReferences } from '../payment/payment-references.js';
import { isVoucherExpired } from '../vouchers/voucher-expiry.js';
import { VOUCHER_UNAVAILABLE_MESSAGE } from '../vouchers/voucher-messages.js';
import { calculateOrderAmounts, isOrderAutoCancellationDue, isOrderPaymentOverdue } from './order-checkout.js';
import { canAdvanceOrder } from './order-workflow.js';
import { requestFingerprint } from '../../common/idempotency.js';

function generateOrderCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `OD-${year}-${rand}`;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  private get orderInclude() {
    return {
      items: { include: { product: true } },
      voucherUsage: { include: { voucher: true } },
      transactions: {
        include: { confirmedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' as const },
      },
    };
  }

  private get adminOrderInclude() {
    return {
      ...this.orderInclude,
      customer: { select: { name: true, phone: true } },
      bankTransferReferences: { select: { reference: true }, orderBy: { createdAt: 'asc' as const } },
    };
  }

  private async findIdempotentOrder(key: string, fingerprint: string, includeCounterSale = false) {
    const order = await this.prisma.order.findUnique({
      where: { idempotencyKey: key },
      include: includeCounterSale
        ? {
            ...this.adminOrderInclude,
            paymentIntents: { orderBy: { createdAt: 'desc' } },
          }
        : this.orderInclude,
    });
    if (!order) return null;
    if (order.idempotencyHash !== fingerprint) {
      throw new ConflictException('Mã yêu cầu này đã được dùng cho nội dung khác. Hãy tải lại thao tác rồi thử lại.');
    }
    return order;
  }

  async create(customerId: string, dto: CreateOrderDto, idempotencyKey?: string) {
    const idempotencyHash = idempotencyKey
      ? requestFingerprint('online-order', customerId, dto)
      : undefined;
    if (idempotencyKey && idempotencyHash) {
      const existing = await this.findIdempotentOrder(idempotencyKey, idempotencyHash);
      if (existing) return existing;
    }
    try {
      return await this.createFreshOrder(customerId, dto, idempotencyKey, idempotencyHash);
    } catch (error) {
      if (idempotencyKey && idempotencyHash) {
        const existing = await this.findIdempotentOrder(idempotencyKey, idempotencyHash);
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async createFreshOrder(
    customerId: string,
    dto: CreateOrderDto,
    idempotencyKey?: string,
    idempotencyHash?: string,
  ) {
    if (dto.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Đơn hàng trực tuyến chỉ hỗ trợ thanh toán QR chuyển khoản.');
    }
    if (!this.paymentService.getSepayAccountConfig('ORDER').configured) {
      throw new BadRequestException('Thanh toán QR chưa được cấu hình cho kênh đơn hàng.');
    }
    const fulfillmentMethod = dto.fulfillmentMethod ?? FulfillmentMethod.PICKUP;
    if (fulfillmentMethod === FulfillmentMethod.DELIVERY) {
      if (!dto.deliveryAreaId || !dto.deliveryAddress?.trim() || !dto.contactName?.trim() || !dto.contactPhone?.trim() || dto.expectedDeliveryFee === undefined) {
        throw new BadRequestException('Cần chọn khu vực giao và nhập đủ địa chỉ, tên, số điện thoại người nhận.');
      }
    } else if (dto.deliveryAreaId || dto.deliveryAddress || (dto.shippingAddress && !['PICKUP', 'STORE_PICKUP'].includes(dto.shippingAddress))) {
      throw new BadRequestException('Đơn nhận tại cửa hàng không dùng địa chỉ giao hàng.');
    }

    // 1. Validate stock và snapshot giá
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } });

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new NotFoundException(`Sản phẩm ${item.productId} không tồn tại.`);
      if (product.price <= 0) {
        throw new BadRequestException(`Sản phẩm "${product.name}" chưa có giá bán hợp lệ. Hàng tặng cần được ghi nhận bằng điều chỉnh tồn.`);
      }
      const availableStock = product.stock - product.reservedStock;
      if (availableStock < item.quantity) {
        throw new BadRequestException(`Sản phẩm "${product.name}" chỉ còn ${Math.max(0, availableStock)} đơn vị khả dụng.`);
      }
    }

    const subtotal = dto.items.reduce((acc, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return acc + product.price * item.quantity;
    }, 0);

    // 2. Apply voucher
    let discount = 0;
    let voucherId: string | undefined;
    let voucherWalletUsageId: string | null = null;

    if (dto.voucherCode || dto.voucherId) {
      const voucher = dto.voucherCode
        ? await this.prisma.voucher.findUnique({ where: { code: dto.voucherCode.trim().toUpperCase() } })
        : await this.prisma.voucher.findUnique({ where: { id: dto.voucherId } });

      if (!voucher || !voucher.isActive) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      if (isVoucherExpired(voucher.expiryDate)) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      if (voucher.minSpend > subtotal) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      if (voucher.usageLimit !== -1 && voucher.usageCount >= voucher.usageLimit) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);

      if (voucher.pointCost !== null) {
        const unspentVoucher = await this.prisma.voucherUsage.findFirst({
          where: {
            voucherId: voucher.id,
            userId: customerId,
            bookingId: null,
            orderId: null,
          },
        });
        if (!unspentVoucher) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        voucherWalletUsageId = unspentVoucher.id;
      } else if (voucher.usageLimitPerUser !== -1) {
        const alreadyUsed = await this.prisma.voucherUsage.findFirst({
          where: {
            voucherId: voucher.id,
            userId: customerId,
            OR: [{ bookingId: { not: null } }, { orderId: { not: null } }],
          },
        });
        if (alreadyUsed) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }

      if (voucher.discountType === 'PERCENTAGE') {
        discount = Math.round((subtotal * voucher.discountValue) / 100);
        if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
      } else {
        discount = voucher.discountValue;
      }
      voucherId = voucher.id;
    }

    const merchandiseTotal = calculateOrderAmounts(subtotal, discount, 0).merchandiseTotal;
    if ((dto.voucherCode || dto.voucherId) && merchandiseTotal <= 0) {
      throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
    }

    const finalNote = dto.note?.trim() || null;

    // 3. Tạo đơn trong transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const deliveryArea = fulfillmentMethod === FulfillmentMethod.DELIVERY
        ? await tx.deliveryArea.findUnique({ where: { id: dto.deliveryAreaId! } })
        : null;
      if (fulfillmentMethod === FulfillmentMethod.DELIVERY && !deliveryArea?.isActive) {
        throw new BadRequestException('PetCare chưa hỗ trợ giao đến khu vực này.');
      }
      const deliveryFee = deliveryArea?.fee ?? 0;
      if (fulfillmentMethod === FulfillmentMethod.DELIVERY && dto.expectedDeliveryFee !== deliveryFee) {
        throw new BadRequestException('Phí giao hàng vừa thay đổi. Hãy tải lại khu vực và xác nhận tổng tiền mới.');
      }
      const total = calculateOrderAmounts(subtotal, discount, deliveryFee).total;
      if (voucherId) {
        await tx.$queryRaw`SELECT "id" FROM "vouchers" WHERE "id" = ${voucherId} FOR UPDATE`;
        const currentVoucher = await tx.voucher.findUnique({ where: { id: voucherId } });
        if (!currentVoucher?.isActive || isVoucherExpired(currentVoucher.expiryDate)) {
          throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }
        if (currentVoucher.usageLimit !== -1 && currentVoucher.usageCount >= currentVoucher.usageLimit) {
          throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }
        if (voucherWalletUsageId === null && currentVoucher.usageLimitPerUser !== -1) {
          const accountUsageCount = await tx.voucherUsage.count({
            where: {
              voucherId,
              userId: customerId,
              OR: [{ bookingId: { not: null } }, { orderId: { not: null } }],
            },
          });
          if (accountUsageCount >= currentVoucher.usageLimitPerUser) {
            throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          }
        }
      }

      const newOrder = await tx.order.create({
        data: {
          code: generateOrderCode(),
          idempotencyKey,
          idempotencyHash,
          customerId,
          subtotal,
          discount,
          total,
          fulfillmentMethod,
          deliveryAreaId: deliveryArea?.id ?? null,
          deliveryProvince: deliveryArea?.province ?? null,
          deliveryWard: deliveryArea?.ward ?? null,
          deliveryAddress: fulfillmentMethod === FulfillmentMethod.DELIVERY ? dto.deliveryAddress!.trim() : null,
          deliveryFee,
          contactName: fulfillmentMethod === FulfillmentMethod.DELIVERY ? dto.contactName!.trim() : null,
          contactPhone: fulfillmentMethod === FulfillmentMethod.DELIVERY ? dto.contactPhone!.trim() : null,
          paymentCode: generatePaymentCode('PCOD', 20),
          paymentExpiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          paymentMethod: dto.paymentMethod,
          note: finalNote,
          items: {
            create: dto.items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                priceApplied: product.price,
              };
            }),
          },
        },
        include: this.orderInclude,
      });

      // Trừ tồn khả dụng mà không tiêu thụ số lượng đang được giữ cho QR.
      for (const item of dto.items) {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        const changed = await tx.$executeRaw`
          UPDATE "products"
          SET "stock" = "stock" - ${item.quantity}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${item.productId}
            AND "isActive" = TRUE
            AND "stock" - "reservedStock" >= ${item.quantity}
        `;
        if (changed !== 1) {
          throw new BadRequestException(`Sản phẩm "${product.name}" vừa hết số lượng khả dụng.`);
        }
      }

      // Voucher usage
      if (voucherId) {
        if (voucherWalletUsageId) {
          const claimedVoucher = await tx.voucherUsage.updateMany({
            where: { id: voucherWalletUsageId, bookingId: null, orderId: null },
            data: { orderId: newOrder.id, usedAt: new Date() },
          });
          if (claimedVoucher.count === 0) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        } else {
          await tx.voucherUsage.create({
            data: { voucherId, userId: customerId, orderId: newOrder.id, usedAt: new Date() },
          });
        }
        await tx.voucher.update({ where: { id: voucherId }, data: { usageCount: { increment: 1 } } });
      }

      await tx.notification.create({
        data: {
          userId: customerId,
          title: 'Đặt hàng thành công',
          body: `Đơn hàng ${newOrder.code} đã được tạo.`,
          type: 'ORDER',
          refId: newOrder.id,
        },
      });

      return newOrder;
    });

    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { email: true },
    });
    if (customer?.email) {
      await this.mailService?.sendBusinessNotificationEmail(
        customer.email,
        'PetCare đã nhận đơn hàng của bạn',
        `Đơn hàng ${order.code} đã được tạo. Vui lòng thanh toán trong 24 giờ. PetCare sẽ thông báo khi đơn ${fulfillmentMethod === FulfillmentMethod.DELIVERY ? 'sẵn sàng giao' : 'sẵn sàng để bạn đến nhận tại cửa hàng'}.`,
      );
    }

    return order;
  }

  async createInStoreSale(dto: CreateInStoreSaleDto, idempotencyKey?: string, staffId?: string) {
    const idempotencyHash = idempotencyKey
      ? requestFingerprint('counter-sale', staffId ?? 'unknown-staff', dto)
      : undefined;
    if (idempotencyKey && idempotencyHash) {
      const existing = await this.findIdempotentOrder(idempotencyKey, idempotencyHash, true);
      if (existing) {
        const paymentIntent = (existing as any).paymentIntents?.[0] ?? null;
        return {
          order: existing,
          paymentIntent,
          transferInfo: paymentIntent ? `${existing.code} ${paymentIntent.paymentRef}` : null,
        };
      }
    }
    try {
      return await this.createFreshCounterSale(dto, idempotencyKey, idempotencyHash);
    } catch (error) {
      if (idempotencyKey && idempotencyHash) {
        const existing = await this.findIdempotentOrder(idempotencyKey, idempotencyHash, true);
        if (existing) {
          const paymentIntent = (existing as any).paymentIntents?.[0] ?? null;
          return {
            order: existing,
            paymentIntent,
            transferInfo: paymentIntent ? `${existing.code} ${paymentIntent.paymentRef}` : null,
          };
        }
      }
      throw error;
    }
  }

  private async createFreshCounterSale(
    dto: CreateInStoreSaleDto,
    idempotencyKey?: string,
    idempotencyHash?: string,
  ) {
    if (![PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER].includes(dto.paymentMethod)) {
      throw new BadRequestException('Bán tại quầy chỉ hỗ trợ tiền mặt hoặc QR.');
    }
    const isQr = dto.paymentMethod === PaymentMethod.BANK_TRANSFER;
    if (isQr && !this.paymentService.getSepayAccountConfig('ORDER').configured) {
      throw new BadRequestException('Thanh toán QR chưa được cấu hình cho kênh đơn hàng.');
    }

    const quantities = new Map<string, number>();
    for (const item of dto.items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    const items = Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }));
    const now = new Date();

    const sale = await this.prisma.$transaction(async (tx) => {
      await this.expireCounterSaleReservations(tx, now);

      const products = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) }, isActive: true },
      });
      if (products.length !== items.length) {
        throw new NotFoundException('Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng bán.');
      }
      const zeroPriceProduct = products.find((product) => product.price <= 0);
      if (zeroPriceProduct) {
        throw new BadRequestException(`Sản phẩm "${zeroPriceProduct.name}" chưa có giá bán hợp lệ. Hàng tặng cần được ghi nhận bằng điều chỉnh tồn.`);
      }

      if (dto.customerId) {
        const customer = await tx.user.findFirst({
          where: { id: dto.customerId, role: Role.CUSTOMER, isActive: true },
          select: { id: true },
        });
        if (!customer) throw new NotFoundException('Không tìm thấy tài khoản khách hàng đang hoạt động.');
      }
      if (dto.voucherCode && !dto.customerId) {
        throw new BadRequestException('Cần gắn tài khoản khách hàng mới áp dụng voucher tại quầy.');
      }

      const subtotal = items.reduce((sum, item) => {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        return sum + product.price * item.quantity;
      }, 0);

      let discount = 0;
      let voucherId: string | null = null;
      let walletVoucherUsageId: string | null = null;
      let appliedVoucherCode: string | null = null;

      if (dto.voucherCode && dto.customerId) {
        const requestedVoucher = await tx.voucher.findUnique({
          where: { code: dto.voucherCode.trim().toUpperCase() },
          select: { id: true },
        });
        if (!requestedVoucher) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);

        // Serialize claims for this voucher so its usage limit and per-customer use stay consistent.
        await tx.$queryRaw`SELECT "id" FROM "vouchers" WHERE "id" = ${requestedVoucher.id} FOR UPDATE`;
        const voucher = await tx.voucher.findUnique({ where: { id: requestedVoucher.id } });
        if (!voucher || !voucher.isActive) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        if (isVoucherExpired(voucher.expiryDate, now)) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        if (voucher.minSpend > subtotal) {
          throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }
        if (voucher.usageLimit !== -1 && voucher.usageCount >= voucher.usageLimit) {
          throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        }

        if (voucher.pointCost !== null) {
          const walletVoucher = await tx.voucherUsage.findFirst({
            where: { voucherId: voucher.id, userId: dto.customerId, bookingId: null, orderId: null },
            select: { id: true },
          });
          if (!walletVoucher) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          walletVoucherUsageId = walletVoucher.id;
        } else {
          const existingUsage = await tx.voucherUsage.findFirst({
            where: {
              voucherId: voucher.id,
              userId: dto.customerId,
              OR: [{ bookingId: { not: null } }, { orderId: { not: null } }],
            },
            select: { id: true },
          });
          if (voucher.usageLimitPerUser !== -1 && existingUsage) {
            throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
          }
        }

        discount = voucher.discountType === DiscountType.PERCENTAGE
          ? Math.round((subtotal * voucher.discountValue) / 100)
          : voucher.discountValue;
        if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
        discount = Math.min(discount, subtotal);
        voucherId = voucher.id;
        appliedVoucherCode = voucher.code;
      }

      const total = Math.max(0, subtotal - discount);
      if (dto.voucherCode && total <= 0) {
        throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
      }
      const order = await tx.order.create({
        data: {
          code: generateOrderCode(),
          idempotencyKey,
          idempotencyHash,
          customerId: dto.customerId ?? null,
          source: OrderSource.IN_STORE,
          status: isQr ? OrderStatus.PENDING : OrderStatus.COMPLETED,
          subtotal,
          discount,
          total,
          paymentMethod: dto.paymentMethod,
          isPaid: !isQr,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceApplied: products.find((product) => product.id === item.productId)!.price,
            })),
          },
        },
      });

      if (voucherId && dto.customerId) {
        if (walletVoucherUsageId) {
          const claimedVoucher = await tx.voucherUsage.updateMany({
            where: { id: walletVoucherUsageId, userId: dto.customerId, bookingId: null, orderId: null },
            data: { orderId: order.id, usedAt: now },
          });
          if (claimedVoucher.count !== 1) throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
        } else {
          await tx.voucherUsage.create({
            data: { voucherId, userId: dto.customerId, orderId: order.id, usedAt: now },
          });
        }
        await tx.voucher.update({ where: { id: voucherId }, data: { usageCount: { increment: 1 } } });
      }

      if (isQr) {
        for (const item of items) {
          const product = products.find((candidate) => candidate.id === item.productId)!;
          const changed = await tx.$executeRaw`
            UPDATE "products"
            SET "reservedStock" = "reservedStock" + ${item.quantity}, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${item.productId}
              AND "isActive" = TRUE
              AND "stock" - "reservedStock" >= ${item.quantity}
          `;
          if (changed !== 1) {
            throw new BadRequestException(`Sản phẩm "${product.name}" vừa hết số lượng khả dụng.`);
          }
        }

        const expiresAt = new Date(now.getTime() + 15 * 60_000);
        const paymentIntent = await tx.orderPaymentIntent.create({
          data: {
            orderId: order.id,
            amount: order.total,
            paymentRef: generatePaymentCode('PCOD', 8),
            expiresAt,
          },
        });
        const fullOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: this.adminOrderInclude,
        });
        return {
          order: fullOrder,
          paymentIntent,
          transferInfo: `${order.code} ${paymentIntent.paymentRef}`,
        };
      }

      for (const item of items) {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        const changed = await tx.$executeRaw`
          UPDATE "products"
          SET "stock" = "stock" - ${item.quantity}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${item.productId}
            AND "isActive" = TRUE
            AND "stock" - "reservedStock" >= ${item.quantity}
        `;
        if (changed !== 1) {
          throw new BadRequestException(`Sản phẩm "${product.name}" vừa hết số lượng khả dụng.`);
        }
      }

      await tx.transaction.create({
        data: {
          orderId: order.id,
          amount: order.total,
          type: 'FINAL_PAYMENT',
          paymentMethod: PaymentMethod.CASH,
          note: appliedVoucherCode
            ? `Bán sản phẩm tại quầy; áp dụng voucher ${appliedVoucherCode}.`
            : 'Bán sản phẩm tại quầy.',
        },
      });
      await this.awardOrderPoints(tx, { id: order.id, code: order.code, total: order.total, customerId: order.customerId });

      return {
        order: await tx.order.findUnique({ where: { id: order.id }, include: this.adminOrderInclude }),
        paymentIntent: null,
        transferInfo: null,
      };
    });

    if (!sale.paymentIntent && sale.order?.customerId) {
      const customer = await this.prisma.user.findUnique({
        where: { id: sale.order.customerId },
        select: { email: true },
      });
      if (customer?.email) {
        await this.mailService?.sendBusinessNotificationEmail(
          customer.email,
          'Xác nhận mua hàng tại cửa hàng PetCare',
          `Giao dịch ${sale.order.code} đã thanh toán thành công với tổng số tiền ${sale.order.total.toLocaleString('vi-VN')}đ. Cảm ơn bạn đã mua hàng tại PetCare.`,
        );
      }
    }

    return sale;
  }

  async releaseExpiredCounterSaleReservations() {
    const now = new Date();
    return this.prisma.$transaction((tx) => this.expireCounterSaleReservations(tx, now));
  }

  private async expireCounterSaleReservations(tx: Prisma.TransactionClient, now: Date) {
    const expired = await tx.orderPaymentIntent.findMany({
      where: {
        status: BookingPaymentIntentStatus.PENDING,
        expiresAt: { lte: now },
        order: { source: OrderSource.IN_STORE },
      },
      include: { order: { include: { items: true, voucherUsage: { include: { voucher: true } } } } },
    });
    let released = 0;

    for (const intent of expired) {
      const claimed = await tx.orderPaymentIntent.updateMany({
        where: { id: intent.id, status: BookingPaymentIntentStatus.PENDING, expiresAt: { lte: now } },
        data: { status: BookingPaymentIntentStatus.CANCELLED },
      });
      if (claimed.count !== 1) continue;

      for (const item of intent.order.items) {
        const changed = await tx.product.updateMany({
          where: { id: item.productId, reservedStock: { gte: item.quantity } },
          data: { reservedStock: { decrement: item.quantity } },
        });
        if (changed.count !== 1) {
          throw new BadRequestException('Không thể giải phóng lượng tồn đang giữ. Vui lòng liên hệ hỗ trợ.');
        }
      }
      await this.releaseCounterSaleVoucher(tx, intent.order);
      await tx.order.updateMany({
        where: { id: intent.orderId, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
      released += 1;
    }
    return released;
  }

  async cancelCounterSalePaymentIntent(intentId: string) {
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await this.expireCounterSaleReservations(tx, now);
      const intent = await tx.orderPaymentIntent.findUnique({
        where: { id: intentId },
        include: { order: { include: { items: true, voucherUsage: { include: { voucher: true } } } } },
      });
      if (!intent || intent.order.source !== OrderSource.IN_STORE) {
        throw new NotFoundException('Không tìm thấy giao dịch bán tại quầy.');
      }
      if (intent.status === BookingPaymentIntentStatus.CANCELLED) return intent;
      if (intent.status !== BookingPaymentIntentStatus.PENDING) {
        throw new BadRequestException('Giao dịch đã nhận tiền hoặc cần hỗ trợ, không thể hủy mã QR.');
      }

      const cancelled = await tx.orderPaymentIntent.updateMany({
        where: { id: intent.id, status: BookingPaymentIntentStatus.PENDING },
        data: { status: BookingPaymentIntentStatus.CANCELLED },
      });
      if (cancelled.count !== 1) throw new BadRequestException('Mã QR vừa được cập nhật ở nơi khác.');
      for (const item of intent.order.items) {
        const changed = await tx.product.updateMany({
          where: { id: item.productId, reservedStock: { gte: item.quantity } },
          data: { reservedStock: { decrement: item.quantity } },
        });
        if (changed.count !== 1) throw new BadRequestException('Không thể giải phóng lượng tồn đang giữ.');
      }
      await this.releaseCounterSaleVoucher(tx, intent.order);
      await tx.order.updateMany({
        where: { id: intent.orderId, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
      return tx.orderPaymentIntent.findUnique({ where: { id: intent.id } });
    });
    return result;
  }

  private async releaseCounterSaleVoucher(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      voucherUsage: {
        id: string;
        voucherId: string;
        voucher: { pointCost: number | null };
      } | null;
    },
  ) {
    const usage = order.voucherUsage;
    if (!usage) return;

    const released = usage.voucher.pointCost !== null
      ? await tx.voucherUsage.updateMany({
          where: { id: usage.id, orderId: order.id },
          data: { orderId: null },
        })
      : await tx.voucherUsage.deleteMany({ where: { id: usage.id, orderId: order.id } });
    if (released.count !== 1) {
      throw new BadRequestException('Không thể khôi phục voucher cho khách. Hãy tải lại giao dịch hoặc liên hệ hỗ trợ.');
    }

    const usageCountDecremented = await tx.voucher.updateMany({
      where: { id: usage.voucherId, usageCount: { gt: 0 } },
      data: { usageCount: { decrement: 1 } },
    });
    if (usageCountDecremented.count !== 1) {
      throw new BadRequestException('Không thể cập nhật lượt dùng voucher. Hãy liên hệ hỗ trợ.');
    }
  }

  async findCounterSalePaymentIntent(intentId: string) {
    const intent = await this.prisma.orderPaymentIntent.findUnique({
      where: { id: intentId },
      include: {
        bankTransferReferences: { select: { reference: true }, orderBy: { createdAt: 'asc' } },
        order: { select: { code: true, source: true, status: true, isPaid: true } },
      },
    });
    if (!intent || intent.order.source !== OrderSource.IN_STORE) {
      throw new NotFoundException('Không tìm thấy giao dịch bán tại quầy.');
    }
    return intent;
  }

  async confirmCounterSaleTransfer(intentId: string, dto: ConfirmBankTransferDto, confirmedById: string | null) {
    const references = dto.references?.length ? normalizeTransferReferences(dto.references) : [];
    const reference = references[0] ?? null;
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await this.expireCounterSaleReservations(tx, now);

      const intent = await tx.orderPaymentIntent.findUnique({
        where: { id: intentId },
        include: { order: { include: { items: true, voucherUsage: { include: { voucher: true } } } } },
      });
      if (!intent || intent.order.source !== OrderSource.IN_STORE) {
        throw new NotFoundException('Không tìm thấy giao dịch bán tại quầy.');
      }
      if (intent.status === BookingPaymentIntentStatus.CANCELLED || intent.expiresAt <= now) {
        return { requiresSupport: true, intentId: intent.id, orderCode: intent.order.code };
      }
      if (intent.status === BookingPaymentIntentStatus.COMPLETED) {
        throw new BadRequestException('Giao dịch bán tại quầy đã được xác nhận.');
      }
      if (intent.status === BookingPaymentIntentStatus.REVIEW) {
        throw new BadRequestException('Khoản chuyển này cần được xử lý qua hỗ trợ.');
      }
      if (dto.receivedAmount < intent.amount) {
        throw new BadRequestException('Số tiền đã nhận chưa đủ. Hãy chờ khách chuyển nốt rồi xác nhận một lần khi tổng tiền đã đủ.');
      }
      if (dto.receivedAmount > intent.amount && !dto.excessRefunded) {
        throw new BadRequestException('Hãy hoàn phần tiền chuyển dư bên ngoài PetCare trước khi xác nhận hóa đơn.');
      }

      if (references.length) {
        await reserveTransferReferences(tx, references, { orderId: intent.orderId, orderPaymentIntentId: intent.id });
      }
      const claimed = await tx.orderPaymentIntent.updateMany({
        where: { id: intent.id, status: BookingPaymentIntentStatus.PENDING, expiresAt: { gt: now } },
        data: {
          status: BookingPaymentIntentStatus.COMPLETED,
          externalId: reference,
          receivedAmount: dto.receivedAmount,
          confirmedById,
          excessRefunded: dto.excessRefunded ?? false,
        },
      });
      if (claimed.count !== 1) throw new BadRequestException('Mã thanh toán vừa được cập nhật ở nơi khác.');

      for (const item of intent.order.items) {
        const changed = await tx.$executeRaw`
          UPDATE "products"
          SET "stock" = "stock" - ${item.quantity}, "reservedStock" = "reservedStock" - ${item.quantity}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${item.productId}
            AND "stock" >= ${item.quantity}
            AND "reservedStock" >= ${item.quantity}
        `;
        if (changed !== 1) throw new BadRequestException('Tồn kho không khớp với lượng đang giữ. Vui lòng liên hệ hỗ trợ.');
      }

      await tx.order.update({
        where: { id: intent.orderId },
        data: { isPaid: true, paymentMethod: PaymentMethod.BANK_TRANSFER, status: OrderStatus.COMPLETED },
      });
      const voucherNote = intent.order.voucherUsage
        ? ` Áp dụng voucher ${intent.order.voucherUsage.voucher.code}.`
        : '';
      await tx.transaction.create({
        data: {
          orderId: intent.orderId,
          externalId: reference,
          amount: intent.amount,
          receivedAmount: dto.receivedAmount,
          confirmedById,
          type: 'FINAL_PAYMENT',
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          note: buildTransferPaymentNote(
            references,
            dto.receivedAmount > intent.amount
              ? `Bán tại quầy; đã nhận ${dto.receivedAmount.toLocaleString('vi-VN')}đ và hoàn ${(dto.receivedAmount - intent.amount).toLocaleString('vi-VN')}đ tiền dư bên ngoài PetCare.${voucherNote}`
              : `Bán tại quầy; ${confirmedById ? 'nhân viên đã đối chiếu và xác nhận' : 'SePay đã tự xác nhận'} giao dịch.${voucherNote}`,
          ),
        },
      });
      await this.awardOrderPoints(tx, intent.order);
      return tx.order.findUnique({ where: { id: intent.orderId }, include: this.adminOrderInclude });
    });

    if (result && 'customerId' in result && result.customerId) {
      const customer = await this.prisma.user.findUnique({
        where: { id: result.customerId },
        select: { email: true },
      });
      if (customer?.email) {
        await this.mailService?.sendBusinessNotificationEmail(
          customer.email,
          'Xác nhận mua hàng tại cửa hàng PetCare',
          `Giao dịch ${result.code} đã thanh toán thành công với tổng số tiền ${result.total.toLocaleString('vi-VN')}đ. Cảm ơn bạn đã mua hàng tại PetCare.`,
        );
      }
    }

    return result;
  }

  private async awardOrderPoints(
    tx: Prisma.TransactionClient,
    order: { id: string; code: string; total: number; deliveryFee?: number; customerId?: string | null },
  ) {
    if (!order.customerId) return;
    const pointsEarned = Math.floor((order.total - (order.deliveryFee ?? 0)) / 10000);
    if (pointsEarned <= 0) return;

    const existingEarnTransaction = await tx.loyaltyTransaction.findFirst({
      where: { userId: order.customerId, refId: order.id, type: 'EARN' },
      select: { id: true },
    });
    if (existingEarnTransaction) return;

    await tx.user.update({ where: { id: order.customerId }, data: { loyaltyPoints: { increment: pointsEarned } } });
    await tx.loyaltyTransaction.create({
      data: {
        userId: order.customerId,
        amount: pointsEarned,
        type: 'EARN',
        description: `Tích điểm đơn hàng ${order.code}`,
        refId: order.id,
      },
    });
  }

  async findMyOrders(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: this.orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(({ cancellationReason: _internalReason, ...order }) => order);
  }

  async findByCode(code: string, user: { id: string; role: Role }) {
    const order = await this.prisma.order.findUnique({ where: { code }, include: this.orderInclude });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (user.role === Role.CUSTOMER && order.customerId !== user.id) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }
    if (user.role === Role.CUSTOMER) {
      const { cancellationReason: _internalReason, ...customerOrder } = order;
      return customerOrder;
    }
    return order;
  }

  async findAll(query: { page?: number; limit?: number; status?: OrderStatus; search?: string; overdueOnly?: boolean }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filters: Prisma.OrderWhereInput[] = [];
    if (query.status) filters.push({ status: query.status });
    if (query.overdueOnly) {
      filters.push({ source: OrderSource.ONLINE, isPaid: false, status: { not: OrderStatus.CANCELLED }, paymentExpiresAt: { lte: new Date() } });
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { id: { contains: search, mode: 'insensitive' } },
          { customer: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { customer: { is: { phone: { contains: search } } } },
        ],
      });
    }
    const where: Prisma.OrderWhereInput = filters.length ? { AND: filters } : {};

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({ where, include: this.adminOrderInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);

    return { data: orders.map((order) => ({ ...order, isPaymentOverdue: isOrderPaymentOverdue(order) })), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async confirmOnlineOrderTransfer(id: string, dto: ConfirmBankTransferDto, confirmedById: string) {
    const references = dto.references?.length ? normalizeTransferReferences(dto.references) : [];
    const reference = references[0] ?? null;
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order || order.source !== OrderSource.ONLINE) throw new NotFoundException('Không tìm thấy đơn hàng online.');
      if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Đơn đã hủy; không thể xác nhận thanh toán.');
      if (order.isPaid) throw new BadRequestException('Đơn hàng này đã được thanh toán.');
      if (!order.paymentExpiresAt || order.paymentExpiresAt <= now) {
        throw new BadRequestException('Đơn đã quá hạn thanh toán và sẽ tự hủy. Liên hệ hỗ trợ nếu đã chuyển khoản.');
      }
      if (dto.receivedAmount < order.total) {
        throw new BadRequestException('Số tiền đã nhận chưa đủ. Hãy chờ khách chuyển nốt rồi xác nhận một lần khi tổng tiền đã đủ.');
      }
      if (dto.receivedAmount > order.total && !dto.excessRefunded) {
        throw new BadRequestException('Hãy hoàn phần tiền chuyển dư bên ngoài PetCare trước khi xác nhận hóa đơn.');
      }

      if (references.length) {
        await reserveTransferReferences(tx, references, { orderId: order.id });
      }

      const claimed = await tx.order.updateMany({
        where: { id: order.id, isPaid: false, status: OrderStatus.PENDING, paymentExpiresAt: { gt: now } },
        data: { isPaid: true, paymentMethod: PaymentMethod.BANK_TRANSFER },
      });
      if (claimed.count !== 1) throw new BadRequestException('Đơn vừa được thanh toán hoặc thay đổi trạng thái.');

      await tx.transaction.create({
        data: {
          orderId: order.id,
          externalId: reference,
          amount: order.total,
          receivedAmount: dto.receivedAmount,
          confirmedById,
          type: 'FINAL_PAYMENT',
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          note: buildTransferPaymentNote(
            references,
            dto.receivedAmount > order.total
              ? `Đã nhận ${dto.receivedAmount.toLocaleString('vi-VN')}đ; đã hoàn ${(dto.receivedAmount - order.total).toLocaleString('vi-VN')}đ tiền dư bên ngoài PetCare.`
              : 'Nhân viên đã đối chiếu giao dịch trên SePay và xác nhận trong PetCare.',
          ),
        },
      });
      return tx.order.findUnique({ where: { id: order.id }, include: this.adminOrderInclude });
    });
  }

  async getAdminSummary() {
    const [total, unpaid, overdue, pending, completed, paidTotals, refundedTotals, pendingOrders] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { isPaid: false, status: { not: OrderStatus.CANCELLED } } }),
      this.prisma.order.count({ where: { source: OrderSource.ONLINE, isPaid: false, status: { not: OrderStatus.CANCELLED }, paymentExpiresAt: { lte: new Date() } } }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
      this.prisma.order.aggregate({ where: { isPaid: true }, _sum: { total: true } }),
      this.prisma.transaction.aggregate({
        where: { type: 'REFUND', orderId: { not: null } },
        _sum: { amount: true },
      }),
      this.prisma.order.findMany({
        where: { status: OrderStatus.PENDING },
        select: { id: true, code: true, status: true, total: true, items: { select: { id: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      total,
      unpaid,
      overdue,
      pending,
      completed,
      paidRevenue: Math.max(0, (paidTotals._sum.total ?? 0) - (refundedTotals._sum.amount ?? 0)),
      pendingOrders,
    };
  }

  async getDashboardQueue(page = 1) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const pageSize = 20;
    const now = new Date();
    const where: Prisma.OrderWhereInput = {
      source: OrderSource.ONLINE,
      OR: [
        { isPaid: true, status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.READY, OrderStatus.IN_DELIVERY, OrderStatus.DELIVERY_FAILED] } },
        { isPaid: false, status: { not: OrderStatus.CANCELLED }, paymentExpiresAt: { lte: now } },
      ],
    };
    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: this.adminOrderInclude,
        orderBy: { createdAt: 'asc' },
        skip: (safePage - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page: safePage,
      pageSize,
      orders: orders.map((order) => ({ ...order, isPaymentOverdue: isOrderPaymentOverdue(order) })),
    };
  }

  async updateStatus(id: string, status: OrderStatus) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
      if (order.source === OrderSource.IN_STORE) {
        throw new BadRequestException('Bán tại quầy được tất toán ngay khi xác nhận thanh toán.');
      }

      if (!canAdvanceOrder(order, status)) {
        throw new BadRequestException('Chỉ xử lý đơn đã thanh toán và chuyển đúng bước theo hình thức nhận.');
      }

      const updated = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status },
      });
      if (updated.count !== 1) {
        throw new BadRequestException('Đơn hàng vừa được cập nhật ở nơi khác. Hãy tải lại rồi thử lại.');
      }

      if (status === OrderStatus.COMPLETED) {
        await this.awardOrderPoints(tx, order);
      }
    });

    const updatedOrder = await this.prisma.order.findUnique({ where: { id }, include: this.orderInclude });
    if (status === OrderStatus.READY && updatedOrder?.customerId) {
      const customer = await this.prisma.user.findUnique({
        where: { id: updatedOrder.customerId },
        select: { email: true },
      });
      if (customer?.email) {
        await this.mailService?.sendBusinessNotificationEmail(
          customer.email,
          'Đơn hàng PetCare đã sẵn sàng nhận',
          updatedOrder.fulfillmentMethod === FulfillmentMethod.DELIVERY
            ? `Đơn hàng ${updatedOrder.code} đã sẵn sàng giao. PetCare sẽ mang hàng tới địa chỉ bạn đã chọn.`
            : `Đơn hàng ${updatedOrder.code} đã sẵn sàng. Bạn có thể đến cửa hàng PetCare để nhận hàng.`,
        );
      }
    }
    return updatedOrder;
  }

  async expireOverdueUnpaidOnlineOrders(now = new Date()) {
    const overdueOrders = await this.prisma.order.findMany({
      where: {
        source: OrderSource.ONLINE,
        status: OrderStatus.PENDING,
        isPaid: false,
        paymentExpiresAt: { lte: now },
      },
      select: { id: true },
      orderBy: { paymentExpiresAt: 'asc' },
      take: 100,
    });

    let cancelledCount = 0;
    for (const order of overdueOrders) {
      const cancelled = await this.cancelOnlineOrder(
        order.id,
        'Tự hủy: quá hạn thanh toán 24 giờ.',
        false,
        now,
      );
      if (cancelled) cancelledCount += 1;
    }
    return cancelledCount;
  }

  async cancelOnlineOrder(id: string, reason: string, goodsReturned = false, expiredBefore?: Date) {
    const cancellationReason = reason.trim();
    if (!cancellationReason) {
      throw new BadRequestException('Cần ghi lý do hủy đơn.');
    }
    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true, voucherUsage: { include: { voucher: true } } },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
      if (order.source !== OrderSource.ONLINE) {
        throw new BadRequestException('Chỉ có thể hủy đơn trực tuyến tại đây.');
      }
      if (!new Set<OrderStatus>([OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.READY, OrderStatus.DELIVERY_FAILED]).has(order.status)) {
        throw new BadRequestException('Chỉ có thể hủy đơn trước khi khách nhận hàng hoặc sau khi giao thất bại.');
      }
      if (order.status === OrderStatus.DELIVERY_FAILED && !goodsReturned) {
        throw new BadRequestException('Cần xác nhận hàng đã về cửa hàng trước khi hủy và trả tồn.');
      }
      if (expiredBefore && !isOrderAutoCancellationDue(order, expiredBefore)) return null;

      const cancelled = await tx.order.updateMany({
        where: {
          id,
          source: OrderSource.ONLINE,
          status: expiredBefore ? OrderStatus.PENDING : order.status,
          ...(expiredBefore ? { isPaid: false, paymentExpiresAt: { lte: expiredBefore } } : {}),
        },
        data: { status: OrderStatus.CANCELLED, cancellationReason },
      });
      if (cancelled.count !== 1) {
        if (expiredBefore) return null;
        throw new BadRequestException('Đơn hàng vừa được cập nhật ở nơi khác. Hãy tải lại rồi thử lại.');
      }

      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }

      if (order.voucherUsage) {
        const voucherId = order.voucherUsage.voucherId;
        const usageReleased = order.voucherUsage.voucher.pointCost !== null
          ? await tx.voucherUsage.updateMany({
              where: { id: order.voucherUsage.id, orderId: order.id },
              data: { orderId: null },
            })
          : await tx.voucherUsage.deleteMany({ where: { id: order.voucherUsage.id, orderId: order.id } });
        if (usageReleased.count !== 1) {
          throw new BadRequestException('Không thể trả voucher về ví. Hãy tải lại đơn rồi thử lại.');
        }

        const usageCountDecremented = await tx.voucher.updateMany({
          where: { id: voucherId, usageCount: { gt: 0 } },
          data: { usageCount: { decrement: 1 } },
        });
        if (usageCountDecremented.count !== 1) {
          throw new BadRequestException('Không thể cập nhật lượt dùng voucher. Hãy kiểm tra dữ liệu voucher.');
        }
      }

      if (expiredBefore && order.customerId) {
        await tx.notification.create({
          data: {
            userId: order.customerId,
            title: 'Đơn hàng đã tự hủy',
            body: `Đơn hàng ${order.code} đã quá hạn thanh toán 24 giờ. Hàng và voucher đã được trả.`,
            type: 'ORDER',
            refId: order.id,
          },
        });
      }

      return tx.order.findUnique({ where: { id }, include: this.adminOrderInclude });
    });
    if (expiredBefore && cancelledOrder?.customerId) {
      const customer = await this.prisma.user.findUnique({
        where: { id: cancelledOrder.customerId },
        select: { email: true },
      });
      if (customer?.email) {
        await this.mailService?.sendBusinessNotificationEmail(
          customer.email,
          'Đơn hàng PetCare đã tự hủy',
          `Đơn ${cancelledOrder.code} đã quá hạn thanh toán 24 giờ. Hàng và voucher đã được trả. Nếu bạn đã chuyển khoản, vui lòng liên hệ PetCare để được hỗ trợ.`,
        );
      }
    }
    return cancelledOrder;
  }

  async recordOnlineOrderRefund(id: string, confirmedById: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
      if (order.source !== OrderSource.ONLINE || order.status !== OrderStatus.CANCELLED || !order.isPaid) {
        throw new BadRequestException('Chỉ ghi nhận hoàn tiền cho đơn trực tuyến đã hủy và đã thu tiền.');
      }

      const existingRefund = await tx.transaction.findFirst({
        where: { orderId: id, type: 'REFUND' },
        select: { id: true },
      });
      if (existingRefund) throw new BadRequestException('Khoản hoàn tiền cho đơn này đã được ghi nhận.');

      await tx.transaction.create({
        data: {
          orderId: id,
          amount: order.total,
          confirmedById,
          type: 'REFUND',
          paymentMethod: order.paymentMethod ?? PaymentMethod.BANK_TRANSFER,
          note: `Đã chuyển tiền hoàn cho khách; Admin/Staff ghi nhận đơn ${order.code}.`,
        },
      });

      return tx.order.findUnique({ where: { id }, include: this.adminOrderInclude });
    });
  }


}
