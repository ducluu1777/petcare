import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { matchOnlineOrderPayment, verifySepaySignature } from './sepay-webhook.js';

describe('SePay online order webhook', () => {
  it('verifies the exact raw payload and rejects tampering', () => {
    const raw = Buffer.from('{"id":42,"transferAmount":325000}');
    const timestamp = '1792720800';
    const secret = 'test-secret';
    const signature = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${raw.toString()}`).digest('hex')}`;
    expect(verifySepaySignature(raw, timestamp, signature, secret, 1792720800)).toBe(true);
    expect(verifySepaySignature(Buffer.from('{"id":42,"transferAmount":1}'), timestamp, signature, secret, 1792720800)).toBe(false);
    expect(verifySepaySignature(raw, timestamp, signature, secret, 1792721200)).toBe(false);
  });

  it('matches only an exact incoming payment to a live order and receiving account', () => {
    const order = { source: 'ONLINE', status: 'PENDING', isPaid: false, paymentCode: 'PC123', total: 325000, paymentExpiresAt: new Date('2026-10-24T02:00:00Z') };
    const event = { transferType: 'in', accountNumber: '0123456789', code: 'PC123', transferAmount: 325000 };
    const now = new Date('2026-10-23T03:00:00Z');
    expect(matchOnlineOrderPayment(event, order, '0123456789', now)).toBeNull();
    expect(matchOnlineOrderPayment({ ...event, transferAmount: 300000 }, order, '0123456789', now)).toBe('AMOUNT_MISMATCH');
    expect(matchOnlineOrderPayment({ ...event, accountNumber: '999' }, order, '0123456789', now)).toBe('WRONG_ACCOUNT');
    expect(matchOnlineOrderPayment(event, order, '0123456789', new Date('2026-10-24T02:00:00Z'))).toBe('OVERDUE');
  });

  it('matches an official VA by both the main account and the VA sub-account', () => {
    const order = { source: 'ONLINE', status: 'PENDING', isPaid: false, paymentCode: 'PC123', total: 325000, paymentExpiresAt: new Date('2026-10-24T02:00:00Z') };
    const event = {
      transferType: 'in',
      accountNumber: '0123456789',
      subAccount: 'VQR123456789',
      code: 'PC123',
      transferAmount: 325000,
    };
    const now = new Date('2026-10-23T03:00:00Z');

    expect(matchOnlineOrderPayment(event, order, '0123456789', now, 'VQR123456789')).toBeNull();
    expect(matchOnlineOrderPayment({ ...event, subAccount: 'OTHER' }, order, '0123456789', now, 'VQR123456789')).toBe('WRONG_SUB_ACCOUNT');
    expect(matchOnlineOrderPayment({ ...event, accountNumber: 'OTHER' }, order, '0123456789', now, 'VQR123456789')).toBe('WRONG_ACCOUNT');
  });
});
