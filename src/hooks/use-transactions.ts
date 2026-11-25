import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { TransactionItem } from "./use-bookings";

export interface CreateTransactionPayload {
  bookingId: string;
  amount: number;
  type: "FINAL_PAYMENT" | "REFUND";
  paymentMethod: "CASH" | "BANK_TRANSFER";
  proofUrl?: string;
  voucherCode?: string;
}

export interface ConfirmBankTransferPayload {
  references?: string[];
  receivedAmount: number;
  excessRefunded?: boolean;
}

export interface BookingQrPaymentIntent {
  id: string;
  bookingId: string;
  bookingCode: string;
  amount: number;
  voucherCode?: string | null;
  paymentRef: string;
  transferInfo: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REVIEW";
  receivedAmount?: number | null;
  expiresAt: string;
  expired: boolean;
}

export interface AdminTransactionItem extends TransactionItem {
  externalId: string | null;
  confirmedBy?: { id: string; name: string } | null;
  booking: {
    code: string;
    customer: { name: string; phone: string | null };
    pet: { name: string; breed: string | null } | null;
    services?: Array<{ service?: { name?: string | null } | null }>;
  } | null;
  order: {
    code: string;
    source: "ONLINE" | "IN_STORE";
    customer: { name: string; phone: string | null } | null;
    items: Array<{ quantity: number; product: { id: string; name: string } }>;
  } | null;
}

export function useCreateBookingQrIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { bookingId: string; voucherCode?: string }) =>
      apiClient.post<BookingQrPaymentIntent>("/transactions/qr-intent", payload),
    onSuccess: (intent) => {
      queryClient.setQueryData(["transactions", "qr-intent", intent.bookingId], intent);
      return queryClient.invalidateQueries({ queryKey: ["transactions", "qr-intent", intent.bookingId] });
    },
  });
}

export function useCancelBookingQrIntent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (intentId: string) =>
      apiClient.post<BookingQrPaymentIntent>(`/transactions/qr-intent/${intentId}/cancel`, {}),
    onSuccess: (intent) => {
      queryClient.setQueryData(["transactions", "qr-intent", intent.bookingId], intent);
      return queryClient.invalidateQueries({ queryKey: ["transactions", "qr-intent", intent.bookingId] });
    },
  });
}

export function useConfirmBookingQrPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ConfirmBankTransferPayload & { intentId: string }) =>
      apiClient.post<{ success: boolean; bookingCode: string; awaitingHandover: boolean }>(
        `/transactions/qr-intent/${payload.intentId}/confirm`,
        {
          references: payload.references,
          receivedAmount: payload.receivedAmount,
          excessRefunded: payload.excessRefunded,
        },
      ),
    onSuccess: (_result, payload) => {
      queryClient.invalidateQueries({ queryKey: ["transactions", "qr-intent"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["transactions", "qr-intent", payload.intentId] });
    },
  });
}

export function useBookingQrIntent(bookingId?: string, enabled = false, poll = true) {
  return useQuery({
    queryKey: ["transactions", "qr-intent", bookingId],
    queryFn: async () => apiClient.get<BookingQrPaymentIntent | null>(`/transactions/qr-intent/${bookingId}`),
    enabled: enabled && !!bookingId,
    refetchInterval: (query) => enabled && poll && query.state.data?.status === "PENDING" ? 4000 : false,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTransactionPayload) => {
      return apiClient.post<TransactionItem>("/transactions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAllTransactions() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["transactions", "all"],
    queryFn: async () => apiClient.get<AdminTransactionItem[]>("/transactions"),
    enabled: isStaffOrAdmin,
  });
}

export interface TransactionTodaySummary {
  revenue: number;
  cash: number;
  bankTransfer: number;
  transactionCount: number;
}

export function useTransactionTodaySummary() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["transactions", "admin", "today-summary"],
    queryFn: async () => apiClient.get<TransactionTodaySummary>("/transactions/admin/today-summary"),
    enabled: isStaffOrAdmin,
  });
}

export interface DailySummaryItem {
  date: string;
  name: string;
  revenue: number;
  bookings: number;
}

export function useTransactionSummary(days = 7) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["transactions", "summary", days],
    queryFn: async () => apiClient.get<DailySummaryItem[]>(`/transactions/summary?days=${days}`),
    enabled: isStaffOrAdmin,
  });
}
