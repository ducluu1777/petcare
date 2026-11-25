import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { SepayWebhookService } from './sepay-webhook.service.js';

function setup(officialVa = false) {
  const order = {
    id: 'order-1', source: 'ONLINE', status: 'PENDING', isPaid: false,
    paymentCode: 'PC123', total: 325000, paymentExpiresAt: new Date(Date.now() + 60_000),
  };
  const events = new Map<string, Record<string, unknown>>();
  const transactions: Record<string, unknown>[] = [];
  const tx = {
    sepayWebhookEvent: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => events.get(where.id) ?? null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { events.set(data.id as string, data); return data; }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const changed = { ...events.get(where.id), ...data };
        events.set(where.id, changed);
        return changed;
      }),
    },
    bookingPaymentIntent: {
      findUnique: vi.fn(async ({ where }: { where: { paymentRef: string } }) =>
        where.paymentRef === 'PCBOOK01'
          ? {
              id: 'booking-intent-1',
              bookingId: 'booking-1',
              amount: 325000,
              status: 'PENDING',
              externalId: null,
              createdAt: new Date(),
              booking: { id: 'booking-1', code: 'BK001' },
            }
          : null),
    },
    orderPaymentIntent: {
      findUnique: vi.fn(async ({ where }: { where: { paymentRef: string } }) =>
        where.paymentRef === 'PCCOUNTER1'
          ? {
              id: 'order-intent-1',
              orderId: 'counter-order-1',
              amount: 325000,
              status: 'PENDING',
              externalId: null,
              expiresAt: new Date(Date.now() + 60_000),
              order: { source: 'IN_STORE', status: 'PENDING', isPaid: false },
            }
          : null),
    },
    order: {
      findUnique: vi.fn(async ({ where }: { where: { paymentCode: string } }) => where.paymentCode === order.paymentCode ? { ...order } : null),
      updateMany: vi.fn(async () => {
        if (order.isPaid || order.status !== 'PENDING' || order.paymentExpiresAt <= new Date()) return { count: 0 };
        order.isPaid = true;
        return { count: 1 };
      }),
    },
    bankTransferReference: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({})) },
    transaction: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { transactions.push(data); return data; }) },
  };
  const prisma = { ...tx, $transaction: vi.fn(async (run: (tx: typeof tx) => Promise<unknown>) => run(tx)) };
  const config = { get: vi.fn(() => 'test-secret') };
  const payment = {
    getSepayAccountConfig: vi.fn(() => ({ configured: true, accountNumber: officialVa ? 'VQR123456789' : '0123456789' })),
    getSepayWebhookAccountConfig: vi.fn(() => ({
      accountNumber: '0123456789',
      subAccount: officialVa ? 'VQR123456789' : null,
    })),
  };
  const bookingConfirmer = { confirmBookingQrPayment: vi.fn(async () => ({ success: true })) };
  const orders = { confirmCounterSaleTransfer: vi.fn(async () => ({ success: true })) };
  const service = new SepayWebhookService(prisma as never, config as never, payment as never, bookingConfirmer as never, orders as never);
  const send = (changes: Record<string, unknown> = {}) => {
    const payload = {
      id: 42,
      accountNumber: '0123456789',
      subAccount: officialVa ? 'VQR123456789' : null,
      code: 'PC123',
      transferType: 'in',
      transferAmount: 325000,
      referenceCode: 'BANK42',
      ...changes,
    };
    const raw = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `sha256=${createHmac('sha256', 'test-secret').update(timestamp).update('.').update(raw).digest('hex')}`;
    return service.receive(raw, timestamp, signature);
  };
  return { order, events, transactions, bookingConfirmer, orderConfirmations: orders, tx, service, send };
}

describe('SePay webhook bookkeeping', () => {
  it('records one full payment when the signed event matches and ignores a retry', async () => {
    const state = setup();
    await state.send();
    await state.send();
    expect(state.order.isPaid).toBe(true);
    expect(state.transactions).toHaveLength(1);
    expect(state.events.size).toBe(1);
    expect(state.events.get('42')?.status).toBe('CONFIRMED');
  });

  it('confirms a booking payment intent using its SePay payment reference', async () => {
    const state = setup();
    await state.send({ code: 'PCBOOK01' });
    await state.send({ code: 'PCBOOK01' });

    expect(state.bookingConfirmer.confirmBookingQrPayment).toHaveBeenCalledWith(
      'booking-intent-1',
      { references: ['BANK42'], receivedAmount: 325000, excessRefunded: false },
      null,
    );
    expect(state.bookingConfirmer.confirmBookingQrPayment).toHaveBeenCalledTimes(1);
    expect(state.events.get('42')).toMatchObject({ status: 'CONFIRMED', bookingId: 'booking-1' });
  });

  it('confirms a counter-sale payment intent using its SePay payment reference', async () => {
    const state = setup();
    await state.send({ code: 'PCCOUNTER1' });

    expect(state.orderConfirmations.confirmCounterSaleTransfer).toHaveBeenCalledWith(
      'order-intent-1',
      { references: ['BANK42'], receivedAmount: 325000, excessRefunded: false },
      null,
    );
    expect(state.events.get('42')).toMatchObject({ status: 'CONFIRMED', orderId: 'counter-order-1' });
  });

  it('does not auto-confirm a booking when the received amount differs from the intent', async () => {
    const state = setup();
    await state.send({ code: 'PCBOOK01', transferAmount: 300000 });

    expect(state.bookingConfirmer.confirmBookingQrPayment).not.toHaveBeenCalled();
    expect(state.events.get('42')).toMatchObject({ status: 'REVIEW', reason: 'AMOUNT_MISMATCH' });
  });

  it('does not auto-confirm an official VA payment when SePay reports a different VA', async () => {
    const state = setup(true);
    await state.send({ code: 'PCBOOK01', subAccount: 'OTHER' });

    expect(state.bookingConfirmer.confirmBookingQrPayment).not.toHaveBeenCalled();
    expect(state.events.get('42')).toMatchObject({ status: 'REVIEW', reason: 'WRONG_SUB_ACCOUNT' });
  });

  it.each([
    [{ transferAmount: 300000 }, 'AMOUNT_MISMATCH'],
    [{ accountNumber: '999' }, 'WRONG_ACCOUNT'],
    [{ code: 'UNKNOWN' }, 'UNKNOWN_CODE'],
  ])('holds an unmatched event for review', async (changes, reason) => {
    const state = setup();
    await state.send(changes);
    expect(state.order.isPaid).toBe(false);
    expect(state.transactions).toHaveLength(0);
    expect(state.events.get('42')).toMatchObject({ status: 'REVIEW', reason });
  });

  it('holds late payments and a race lost to manual confirmation for review', async () => {
    const late = setup();
    late.order.paymentExpiresAt = new Date(Date.now() - 1000);
    await late.send();
    expect(late.events.get('42')?.reason).toBe('OVERDUE');

    const race = setup();
    race.tx.order.updateMany.mockResolvedValueOnce({ count: 0 });
    await race.send();
    expect(race.transactions).toHaveLength(0);
    expect(race.events.get('42')).toMatchObject({ status: 'REVIEW', reason: 'ORDER_CHANGED' });
  });

  it('rejects an invalid signature before writing to the database', async () => {
    const state = setup();
    await expect(state.service.receive(Buffer.from('{}'), String(Math.floor(Date.now() / 1000)), 'sha256=wrong')).rejects.toThrow();
    expect(state.tx.sepayWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('rejects signed malformed JSON without creating a payment event', async () => {
    const state = setup();
    const raw = Buffer.from('{not json');
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `sha256=${createHmac('sha256', 'test-secret').update(timestamp).update('.').update(raw).digest('hex')}`;
    await expect(state.service.receive(raw, timestamp, signature)).rejects.toThrow('JSON webhook SePay không hợp lệ');
    expect(state.tx.sepayWebhookEvent.create).not.toHaveBeenCalled();
  });
});
