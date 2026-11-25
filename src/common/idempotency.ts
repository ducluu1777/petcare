import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export function requireIdempotencyKey(value?: string): string {
  const key = value?.trim();
  if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
    throw new BadRequestException('Thiếu hoặc sai mã yêu cầu. Hãy tải lại thao tác rồi thử lại.');
  }
  return key;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function requestFingerprint(scope: string, actorId: string, payload: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(stableValue({ scope, actorId, payload })))
    .digest('hex');
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}
