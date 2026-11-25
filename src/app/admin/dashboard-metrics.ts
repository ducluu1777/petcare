import { vietnamDateKey } from "@/lib/calendar-date-utils";

export function getContactRequestAttentionCard({
  openCount,
  isLoading,
  isError,
}: {
  openCount?: number;
  isLoading: boolean;
  isError: boolean;
}) {
  const count = openCount ?? 0;
  return {
    label: "Yêu cầu liên hệ cần phản hồi",
    value: isLoading ? "…" : isError ? "—" : count,
    attention: !isLoading && !isError && count > 0,
  };
}

type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED";

export function summarizeBookings(bookings: Array<{ status: BookingStatus | string; statusV2?: string | null }>) {
  const statuses = bookings.map(({ status, statusV2 }) => statusV2 || status);
  return {
    total: bookings.length,
    active: statuses.filter((status) => ["BOOKED", "ARRIVED", "IN_SERVICE", "READY_FOR_PICKUP", "PENDING", "CONFIRMED", "IN_PROGRESS"].includes(status)).length,
    completed: statuses.filter((status) => status === "DONE" || status === "COMPLETED").length,
  };
}

type BookingOperationalStatus = {
  status: BookingStatus | string;
  statusV2?: string | null;
};

export function summarizeBookingOperationalStatuses(bookings: BookingOperationalStatus[]) {
  const statuses = bookings.map(({ status, statusV2 }) => statusV2 || status);
  const readyForPickup = statuses.filter((status) => status === "READY_FOR_PICKUP").length;
  const cancelled = statuses.filter((status) => status === "CANCELLED").length;
  const noShow = statuses.filter((status) => status === "NO_SHOW").length;

  return {
    readyForPickup,
    cancelled,
    noShow,
    cancelledOrNoShow: cancelled + noShow,
  };
}

type Transaction = {
  amount: number | string;
  type: "DEPOSIT" | "FINAL_PAYMENT" | "REFUND";
  paymentMethod: "CASH" | "BANK_TRANSFER";
  createdAt: string;
};

export function summarizeTransactions(transactions: Transaction[], today = new Date()) {
  return transactions
    .filter((transaction) => vietnamDateKey(new Date(transaction.createdAt)) === vietnamDateKey(today))
    .reduce((summary, transaction) => {
      const amount = Number(transaction.amount) || 0;
      const signedAmount = transaction.type === "REFUND" ? -amount : amount;
      summary.revenue += signedAmount;
      summary[transaction.paymentMethod === "CASH" ? "cash" : "bankTransfer"] += signedAmount;
      summary.transactionCount += 1;
      return summary;
    }, { revenue: 0, cash: 0, bankTransfer: 0, transactionCount: 0 });
}

