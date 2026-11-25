import { randomUUID } from 'node:crypto';

export type PaymentCodePrefix = 'PCSV' | 'PCOD';
export type PaymentCodeSuffixLength = 8 | 20;

export function generatePaymentCode(
  prefix: PaymentCodePrefix,
  suffixLength: PaymentCodeSuffixLength,
): string {
  return `${prefix}${randomUUID().replaceAll('-', '').slice(0, suffixLength).toUpperCase()}`;
}
