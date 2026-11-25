export type OrderPaymentState = "PAID" | "CANCELLED" | "EXPIRED" | "WAITING";

export function getOrderPaymentState(
  order: { isPaid: boolean; status: string; paymentExpiresAt?: string | null },
  now = Date.now(),
): OrderPaymentState {
  if (order.isPaid) return "PAID";
  if (order.status === "CANCELLED") return "CANCELLED";
  if (order.paymentExpiresAt && new Date(order.paymentExpiresAt).getTime() <= now) {
    return "EXPIRED";
  }
  return "WAITING";
}
