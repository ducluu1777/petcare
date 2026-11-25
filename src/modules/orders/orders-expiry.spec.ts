import { describe, expect, it, vi } from 'vitest';
import { OrdersService } from './orders.service.js';

function createExpiryService(updateCount = 1) {
  const now = new Date('2026-10-24T02:00:00.000Z');
  const order = {
    id: 'order-expired',
    code: 'OD-EXPIRED',
    source: 'ONLINE',
    status: 'PENDING',
    isPaid: false,
    paymentExpiresAt: new Date(now.getTime() - 1000),
    customerId: 'customer-1',
    items: [{ productId: 'product-1', quantity: 2 }],
    voucherUsage: null,
  };
  const prisma = {
    user: {
      findUnique: vi.fn(async () => null),
    },
    order: {
      findMany: vi.fn(async () => [{ id: order.id }]),
    },
    product: {
      update: vi.fn(async () => ({})),
    },
    notification: {
      create: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async (run: (tx: unknown) => Promise<unknown>) => run(tx)),
  };
  const tx = {
    order: {
      findUnique: vi.fn(async () => ({ ...order })),
      updateMany: vi.fn(async () => ({ count: updateCount })),
    },
    product: prisma.product,
    notification: prisma.notification,
  };
  const service = new OrdersService(prisma as never, {} as never);
  return { now, order, prisma, tx, service };
}

describe('overdue online order cancellation', () => {
  it('returns stock and notifies the customer once after the atomic expiry claim', async () => {
    const state = createExpiryService();

    await expect(state.service.expireOverdueUnpaidOnlineOrders(state.now)).resolves.toBe(1);
    expect(state.prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ source: 'ONLINE', status: 'PENDING', isPaid: false }),
    }));
    expect(state.tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isPaid: false, paymentExpiresAt: { lte: state.now } }),
      data: expect.objectContaining({ status: 'CANCELLED' }),
    }));
    expect(state.prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { stock: { increment: 2 } },
    });
    expect(state.prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('does not return stock if payment claims the order before the expiry cancellation', async () => {
    const state = createExpiryService(0);

    await expect(state.service.expireOverdueUnpaidOnlineOrders(state.now)).resolves.toBe(0);
    expect(state.prisma.product.update).not.toHaveBeenCalled();
    expect(state.prisma.notification.create).not.toHaveBeenCalled();
  });
});
