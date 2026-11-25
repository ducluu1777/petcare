function isCancelledBooking(status?: string | null, statusV2?: string | null) {
  return status === "CANCELLED" || statusV2 === "CANCELLED";
}

export function getBookingAmountDue(
  status: string | null | undefined,
  statusV2: string | null | undefined,
  isPaid: boolean,
  remainingAmount: number,
) {
  if (isCancelledBooking(status, statusV2) || isPaid) return 0;
  return Math.max(0, remainingAmount);
}

export function getBookingPaymentMessage(
  status: string | null | undefined,
  statusV2: string | null | undefined,
  isPaid: boolean,
) {
  if (isCancelledBooking(status, statusV2)) return "Lịch đã hủy.";
  return isPaid ? "Đã thanh toán hoàn tất" : "Thanh toán tại quầy khi đón bé.";
}
