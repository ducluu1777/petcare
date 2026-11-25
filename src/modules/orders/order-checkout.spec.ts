import { describe, expect, it } from 'vitest';
import { calculateOrderAmounts, isOrderAutoCancellationDue, isOrderPaymentOverdue } from './order-checkout.js';

describe('online order checkout amounts', () => {
  it('adds delivery after the product voucher discount', () => {
    expect(calculateOrderAmounts(350_000, 50_000, 25_000)).toEqual({
      merchandiseTotal: 300_000,
      total: 325_000,
      points: 30,
    });
  });

  it('does not award points for a free product order with delivery fee', () => {
    expect(calculateOrderAmounts(0, 0, 25_000).points).toBe(0);
  });

  it('marks only unpaid live orders overdue at their 24 hour deadline', () => {
    const deadline = new Date('2026-10-24T02:00:00.000Z');
    expect(isOrderPaymentOverdue({ isPaid: false, status: 'PENDING', paymentExpiresAt: deadline }, deadline)).toBe(true);
    expect(isOrderPaymentOverdue({ isPaid: true, status: 'PENDING', paymentExpiresAt: deadline }, deadline)).toBe(false);
    expect(isOrderPaymentOverdue({ isPaid: false, status: 'CANCELLED', paymentExpiresAt: deadline }, deadline)).toBe(false);
  });

  it('auto-cancels only unpaid online orders still waiting for payment', () => {
    const deadline = new Date('2026-10-24T02:00:00.000Z');
    const now = new Date(deadline.getTime() + 1);
    expect(isOrderAutoCancellationDue({ source: 'ONLINE', isPaid: false, status: 'PENDING', paymentExpiresAt: deadline }, now)).toBe(true);
    expect(isOrderAutoCancellationDue({ source: 'IN_STORE', isPaid: false, status: 'PENDING', paymentExpiresAt: deadline }, now)).toBe(false);
    expect(isOrderAutoCancellationDue({ source: 'ONLINE', isPaid: true, status: 'PENDING', paymentExpiresAt: deadline }, now)).toBe(false);
    expect(isOrderAutoCancellationDue({ source: 'ONLINE', isPaid: false, status: 'PROCESSING', paymentExpiresAt: deadline }, now)).toBe(false);
    expect(isOrderAutoCancellationDue({ source: 'ONLINE', isPaid: false, status: 'PENDING', paymentExpiresAt: deadline }, deadline)).toBe(true);
  });
});
