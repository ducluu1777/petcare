import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

type TransferReferenceOwner = {
  orderId?: string;
  bookingPaymentIntentId?: string;
  orderPaymentIntentId?: string;
};

export function normalizeTransferReferences(values: string[]): string[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new BadRequestException('Nhập ít nhất một mã giao dịch đã đối chiếu trên SePay.');
  }

  const references = values.map((value) => typeof value === 'string' ? value.trim() : '');
  if (references.some((reference) => !reference || reference.length > 120)) {
    throw new BadRequestException('Mỗi mã giao dịch cần có nội dung và không dài quá 120 ký tự.');
  }
  if (new Set(references).size !== references.length) {
    throw new BadRequestException('Danh sách có mã giao dịch bị lặp. Hãy kiểm tra lại các mã đã nhập.');
  }

  return references;
}

export async function reserveTransferReferences(
  tx: Prisma.TransactionClient,
  references: string[],
  owner: TransferReferenceOwner,
) {
  const [registered, transactions, bookingIntents, orderIntents] = await Promise.all([
    tx.bankTransferReference.findMany({
      where: { reference: { in: references } },
      select: { reference: true },
    }),
    tx.transaction.findMany({
      where: { externalId: { in: references } },
      select: { externalId: true },
    }),
    tx.bookingPaymentIntent.findMany({
      where: {
        externalId: { in: references },
        ...(owner.bookingPaymentIntentId ? { id: { not: owner.bookingPaymentIntentId } } : {}),
      },
      select: { externalId: true },
    }),
    tx.orderPaymentIntent.findMany({
      where: {
        externalId: { in: references },
        ...(owner.orderPaymentIntentId ? { id: { not: owner.orderPaymentIntentId } } : {}),
      },
      select: { externalId: true },
    }),
  ]);

  if (registered.length || transactions.length || bookingIntents.length || orderIntents.length) {
    throw new BadRequestException('Có mã giao dịch đã được ghi nhận. Hãy kiểm tra lại trên SePay.');
  }

  const saved = await tx.bankTransferReference.createMany({
    data: references.map((reference) => ({ reference, ...owner })),
    skipDuplicates: true,
  });
  if (saved.count !== references.length) {
    throw new BadRequestException('Có mã giao dịch vừa được ghi nhận ở hóa đơn khác. Tải lại và kiểm tra lại trên SePay.');
  }
}

export function buildTransferPaymentNote(references: string[], detail: string): string {
  const referenceNote = references.length ? `Mã giao dịch SePay: ${references.join(', ')}.` : '';
  return [referenceNote, detail].filter(Boolean).join(' ');
}
