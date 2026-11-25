import { describe, expect, it, vi } from 'vitest';
import { AiBookingToken } from './ai-booking-token.js';

describe('booking confirmation', () => {
  const input = { userId: 'owner', petId: 'pet', serviceIds: ['spa'], startAt: '2026-10-22T10:00:00+07:00', expectedState: 'hash' };
  it('binds the confirmation to its owner and exact reviewed fields', () => {
    const codec = new AiBookingToken('secret');
    const quote = codec.issue(input);
    expect(codec.verify(quote.token, 'owner')).toMatchObject(input);
    expect(() => codec.verify(quote.token, 'other')).toThrow('không hợp lệ');
    expect(() => codec.verify(`${quote.token}tamper`, 'owner')).toThrow();
    expect(() => new AiBookingToken('other-secret').verify(quote.token, 'owner')).toThrow();
  });
  it('expires after ten minutes and rejects reuse as a forged quote', () => {
    vi.useFakeTimers();
    try {
      const codec = new AiBookingToken('secret');
      const quote = codec.issue(input);
      vi.advanceTimersByTime(600_000);
      expect(() => codec.verify(quote.token, 'owner')).toThrow('hết hạn');
      expect(() => codec.verify('not.a.quote', 'owner')).toThrow();
    } finally { vi.useRealTimers(); }
  });
});
