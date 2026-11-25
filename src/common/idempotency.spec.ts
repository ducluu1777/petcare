import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { requireIdempotencyKey, requestFingerprint } from './idempotency.js';

describe('request idempotency helpers', () => {
  it('requires a bounded request key', () => {
    expect(() => requireIdempotencyKey(undefined)).toThrow(BadRequestException);
    expect(() => requireIdempotencyKey('short')).toThrow(BadRequestException);
    expect(requireIdempotencyKey('c4adf23f-53d7-4df4-a7c5-6700926aa9f0')).toBe('c4adf23f-53d7-4df4-a7c5-6700926aa9f0');
  });

  it('fingerprints object payloads independent of property order', () => {
    expect(requestFingerprint('checkout', 'user-1', { a: 1, b: 2 }))
      .toBe(requestFingerprint('checkout', 'user-1', { b: 2, a: 1 }));
  });

  it('keeps operation and actor in the fingerprint', () => {
    const first = requestFingerprint('checkout', 'user-1', { amount: 300 });
    expect(requestFingerprint('pos', 'user-1', { amount: 300 })).not.toBe(first);
    expect(requestFingerprint('checkout', 'user-2', { amount: 300 })).not.toBe(first);
    expect(requestFingerprint('checkout', 'user-1', { amount: 301 })).not.toBe(first);
  });
});
