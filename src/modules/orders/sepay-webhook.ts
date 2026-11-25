import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SepayIncomingTransfer {
  id: number | string;
  accountNumber: string;
  subAccount?: string | null;
  code: string | null;
  transferType: string;
  transferAmount: number;
  referenceCode?: string | null;
}

export function verifySepaySignature(
  rawBody: Buffer,
  timestamp: string,
  signature: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const sentAt = Number(timestamp);
  if (!secret || !Number.isInteger(sentAt) || Math.abs(nowSeconds - sentAt) > 300 || !/^sha256=[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }
  const expected = `sha256=${createHmac('sha256', secret).update(timestamp).update('.').update(rawBody).digest('hex')}`;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature.toLowerCase()));
}

export function matchOnlineOrderPayment(
  transfer: Pick<SepayIncomingTransfer, 'accountNumber' | 'subAccount' | 'code' | 'transferType' | 'transferAmount'>,
  order: { source: string; status: string; isPaid: boolean; paymentCode: string | null; total: number; paymentExpiresAt: Date | null },
  receivingAccount: string,
  now = new Date(),
  expectedSubAccount: string | null = null,
): string | null {
  if (transfer.transferType !== 'in') return 'NOT_INCOMING';
  if (transfer.accountNumber.replace(/\s/g, '') !== receivingAccount.replace(/\s/g, '')) return 'WRONG_ACCOUNT';
  if (expectedSubAccount && transfer.subAccount?.replace(/\s/g, '') !== expectedSubAccount) return 'WRONG_SUB_ACCOUNT';
  if (!transfer.code || transfer.code !== order.paymentCode) return 'WRONG_CODE';
  if (order.source !== 'ONLINE' || order.status !== 'PENDING' || order.isPaid) return 'ORDER_NOT_PAYABLE';
  if (!order.paymentExpiresAt || order.paymentExpiresAt <= now) return 'OVERDUE';
  if (!Number.isInteger(transfer.transferAmount) || transfer.transferAmount !== order.total) return 'AMOUNT_MISMATCH';
  return null;
}
