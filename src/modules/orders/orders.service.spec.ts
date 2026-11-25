import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PaymentService } from '../payment/payment.service.js';
import { requestFingerprint } from '../../common/idempotency.js';

describe('OrdersService - Order creation', () => {
  let service: OrdersService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      product: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      deliveryArea: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      order: {
        create: vi.fn().mockResolvedValue({ id: 'order-1', code: 'OD-TEST', total: 0, customerId: null }),
        findUnique: vi.fn().mockResolvedValue({ id: 'order-1', code: 'OD-TEST', total: 0, customerId: null }),
      },
      transaction: { create: vi.fn() },
      orderPaymentIntent: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      },
      voucher: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      voucherUsage: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      loyaltyTransaction: {
        create: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
      $executeRaw: vi.fn().mockResolvedValue(1),
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };
    const paymentServiceMock = {
      getSepayAccountConfig: vi.fn().mockReturnValue({ configured: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PaymentService, useValue: paymentServiceMock },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an order at its voucher-adjusted total without redeeming points as money', async () => {
    const mockProduct = {
      id: 'prod-1',
      name: 'Hạt dinh dưỡng cao cấp Royal Canin',
      price: 200000,
      stock: 10,
    };
    prismaMock.product.findMany.mockResolvedValue([mockProduct]);
    prismaMock.order.create.mockResolvedValue({
      id: 'order-1',
      code: 'DH-240901',
      subtotal: 200000,
      discount: 0,
      total: 200000,
    });

    const result = await service.create('user-1', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      shippingAddress: 'PICKUP',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    });

    expect(result).toBeDefined();
    expect(prismaMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 200000,
          discount: 0,
          total: 200000,
          paymentCode: expect.stringMatching(/^PCOD[A-Z0-9]{20}$/),
        }),
      }),
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('replays an online order when the same idempotency key is submitted again', async () => {
    const requestKey = 'req-online-00000001';
    const dto = {
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    };
    let storedOrder: any = null;
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod-1', name: 'Hạt dinh dưỡng', price: 200000, stock: 5, reservedStock: 0 },
    ]);
    prismaMock.order.create.mockImplementation(async ({ data }: any) => {
      storedOrder = { id: 'order-idempotent', ...data };
      return storedOrder;
    });
    prismaMock.order.findUnique.mockImplementation(async ({ where }: any) =>
      where.idempotencyKey || where.id ? storedOrder : null,
    );

    const first = await (service.create as any)('user-1', dto, requestKey);
    const second = await (service.create as any)('user-1', dto, requestKey);

    expect(second).toEqual(first);
    expect(prismaMock.order.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('rejects reusing an online order key with different checkout details', async () => {
    const requestKey = 'req-online-00000002';
    const dto = {
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    };
    const storedOrder = {
      id: 'existing-order',
      idempotencyHash: requestFingerprint('online-order', 'user-1', dto),
    };
    prismaMock.order.findUnique.mockResolvedValue(storedOrder);

    await expect((service.create as any)('user-1', { ...dto, items: [{ productId: 'prod-1', quantity: 2 }] }, requestKey))
      .rejects.toThrow('đã được dùng cho nội dung khác');
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('serializes concurrent retries of the same online order key', async () => {
    const requestKey = 'req-online-race-0001';
    const dto = {
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    };
    let storedOrder: any = null;
    let initialLookups = 0;
    let releaseLookups!: () => void;
    const lookupBarrier = new Promise<void>((resolve) => { releaseLookups = resolve; });
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod-1', name: 'Hạt dinh dưỡng', price: 200000, stock: 1, reservedStock: 0 },
    ]);
    prismaMock.order.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id) return storedOrder;
      initialLookups += 1;
      if (initialLookups === 2) releaseLookups();
      await lookupBarrier;
      return storedOrder;
    });
    prismaMock.order.create.mockImplementation(async ({ data }: any) => {
      if (storedOrder) throw Object.assign(new Error('unique key conflict'), { code: 'P2002' });
      storedOrder = { id: 'order-race', ...data };
      return storedOrder;
    });

    const [first, retry] = await Promise.all([
      (service.create as any)('user-1', dto, requestKey),
      (service.create as any)('user-1', dto, requestKey),
    ]);

    expect(retry).toEqual(first);
    expect(prismaMock.order.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('rejects an order quantity greater than current stock', async () => {
    const mockProduct = {
      id: 'prod-1',
      name: 'Hạt dinh dưỡng',
      price: 200000,
      stock: 1,
    };
    prismaMock.product.findMany.mockResolvedValue([mockProduct]);

    await expect(
      service.create('user-1', {
        items: [{ productId: 'prod-1', quantity: 2 }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('uses the active area fee for delivery and snapshots the recipient', async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: 'prod-1', name: 'Hạt', price: 350000, stock: 10, reservedStock: 0 }]);
    prismaMock.deliveryArea.findUnique.mockResolvedValue({ id: 'area-1', province: 'Hà Nội', ward: 'Phường A', fee: 25000, isActive: true });
    await service.create('user-1', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      fulfillmentMethod: 'DELIVERY',
      deliveryAreaId: 'area-1',
      deliveryAddress: '12 Nguyễn Văn A',
      expectedDeliveryFee: 25000,
      contactName: 'Chị Mai',
      contactPhone: '0901234567',
    });
    expect(prismaMock.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ deliveryFee: 25000, total: 375000, deliveryProvince: 'Hà Nội', deliveryWard: 'Phường A', contactName: 'Chị Mai' }),
    }));
  });

  it('rejects delivery to an inactive area before creating the order', async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: 'prod-1', name: 'Hạt', price: 350000, stock: 10, reservedStock: 0 }]);
    prismaMock.deliveryArea.findUnique.mockResolvedValue({ id: 'area-1', fee: 25000, isActive: false });
    await expect(service.create('user-1', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      fulfillmentMethod: 'DELIVERY',
      deliveryAreaId: 'area-1',
      deliveryAddress: '12 Nguyễn Văn A',
      expectedDeliveryFee: 25000,
      contactName: 'Chị Mai',
      contactPhone: '0901234567',
    })).rejects.toThrow('PetCare chưa hỗ trợ giao đến khu vực này.');
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('rejects a changed delivery fee before charging the customer', async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: 'prod-1', name: 'Hạt', price: 350000, stock: 10, reservedStock: 0 }]);
    prismaMock.deliveryArea.findUnique.mockResolvedValue({ id: 'area-1', province: 'Hà Nội', ward: 'Phường A', fee: 30000, isActive: true });
    await expect(service.create('user-1', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      fulfillmentMethod: 'DELIVERY',
      deliveryAreaId: 'area-1',
      deliveryAddress: '12 Nguyễn Văn A',
      expectedDeliveryFee: 25000,
      contactName: 'Chị Mai',
      contactPhone: '0901234567',
    })).rejects.toThrow('Phí giao hàng vừa thay đổi.');
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('rejects a legacy zero-price product in online checkout', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod-free', name: 'Gói thức ăn tặng', price: 0, stock: 10, reservedStock: 0 },
    ]);

    await expect(
      service.create('user-1', {
        items: [{ productId: 'prod-free', quantity: 1 }],
        shippingAddress: 'PICKUP',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('rejects a legacy zero-price product in an in-store sale', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod-free', name: 'Gói thức ăn tặng', price: 0, stock: 10, reservedStock: 0 },
    ]);

    await expect(
      service.createInStoreSale({
        items: [{ productId: 'prod-free', quantity: 1 }],
        paymentMethod: PaymentMethod.CASH,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(prismaMock.orderPaymentIntent.create).not.toHaveBeenCalled();
  });

  it('creates an in-store product QR with a PCOD payment reference', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod-1', name: 'Hạt dinh dưỡng', price: 200000, stock: 5, reservedStock: 0 },
    ]);
    prismaMock.orderPaymentIntent.create.mockImplementation(async ({ data }) => ({
      id: 'intent-1',
      ...data,
    }));

    await service.createInStoreSale({
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    });

    expect(prismaMock.orderPaymentIntent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentRef: expect.stringMatching(/^PCOD[A-Z0-9]{8}$/),
        }),
      }),
    );
  });

  it('replays a POS sale when the same idempotency key is submitted again', async () => {
    const requestKey = 'req-pos-0000000001';
    const dto = {
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.CASH,
    };
    let storedOrder: any = null;
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod-1', name: 'Hạt dinh dưỡng', price: 200000, stock: 5, reservedStock: 0 },
    ]);
    prismaMock.order.create.mockImplementation(async ({ data }: any) => {
      storedOrder = { id: 'pos-idempotent', ...data };
      return storedOrder;
    });
    prismaMock.order.findUnique.mockImplementation(async ({ where }: any) =>
      where.idempotencyKey || where.id ? storedOrder : null,
    );

    const first = await (service.createInStoreSale as any)(dto, requestKey, 'staff-1');
    const second = await (service.createInStoreSale as any)(dto, requestKey, 'staff-1');

    expect(second).toEqual(first);
    expect(prismaMock.order.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
  });

  it('serializes concurrent retries of the same POS sale key', async () => {
    const requestKey = 'req-pos-race-000001';
    const dto = {
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.CASH,
    };
    let storedOrder: any = null;
    let initialLookups = 0;
    let releaseLookups!: () => void;
    const lookupBarrier = new Promise<void>((resolve) => { releaseLookups = resolve; });

    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod-1', name: 'Hạt dinh dưỡng', price: 200000, stock: 5, reservedStock: 0 },
    ]);
    prismaMock.order.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id) return storedOrder;
      initialLookups += 1;
      if (initialLookups === 2) releaseLookups();
      await lookupBarrier;
      return storedOrder;
    });
    prismaMock.order.create.mockImplementation(async ({ data }: any) => {
      if (storedOrder) throw Object.assign(new Error('unique key conflict'), { code: 'P2002' });
      storedOrder = { id: 'pos-race', ...data };
      return storedOrder;
    });

    const [first, retry] = await Promise.all([
      service.createInStoreSale(dto, requestKey, 'staff-1'),
      service.createInStoreSale(dto, requestKey, 'staff-1'),
    ]);

    expect(retry).toEqual(first);
    expect(prismaMock.order.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('rejects reusing a POS key with a different sale payload', async () => {
    const requestKey = 'req-pos-0000000002';
    const dto = {
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.CASH,
    };
    const storedOrder = {
      id: 'existing-pos',
      idempotencyHash: requestFingerprint('counter-sale', 'staff-1', dto),
    };
    prismaMock.order.findUnique.mockResolvedValue(storedOrder);

    await expect((service.createInStoreSale as any)(
      { ...dto, items: [{ productId: 'prod-1', quantity: 2 }] },
      requestKey,
      'staff-1',
    )).rejects.toThrow('đã được dùng cho nội dung khác');
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });
});
