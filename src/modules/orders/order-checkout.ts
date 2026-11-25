export function calculateOrderAmounts(subtotal: number, discount: number, deliveryFee: number) {
  const merchandiseTotal = Math.max(0, subtotal - discount);
  return {
    merchandiseTotal,
    total: merchandiseTotal + deliveryFee,
    points: Math.floor(merchandiseTotal / 10_000),
  };
}

export function isOrderPaymentOverdue(
  order: { isPaid: boolean; status: string; paymentExpiresAt: Date | null },
  now = new Date(),
) {
  return !order.isPaid && order.status !== 'CANCELLED' && !!order.paymentExpiresAt && order.paymentExpiresAt <= now;
}

export function isOrderAutoCancellationDue(
  order: { source: string; isPaid: boolean; status: string; paymentExpiresAt: Date | null },
  now = new Date(),
) {
  return order.source === 'ONLINE'
    && !order.isPaid
    && order.status === 'PENDING'
    && !!order.paymentExpiresAt
    && order.paymentExpiresAt <= now;
}
