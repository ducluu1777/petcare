import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ConfirmBankTransferPayload } from "@/hooks/use-transactions";
import { replaceItemById, replacePagedItemById } from "@/lib/cancelled-query-cache";
import { clearIdempotencyKey, getIdempotencyKey } from "@/lib/idempotency-key";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceApplied: number;
  product?: {
    name: string;
    imageUrl: string;
    stock?: number;
    reservedStock?: number;
  };
}

export interface Order {
  id: string;
  code: string;
  customerId: string | null;
  source: "ONLINE" | "IN_STORE";
  status: "PENDING" | "PROCESSING" | "READY" | "IN_DELIVERY" | "DELIVERY_FAILED" | "COMPLETED" | "CANCELLED";
  fulfillmentMethod: "PICKUP" | "DELIVERY";
  subtotal: number;
  discount: number;
  pointsUsed: number;
  pointsDiscount: number;
  total: number;
  deliveryAreaId?: string | null;
  deliveryProvince?: string | null;
  deliveryWard?: string | null;
  deliveryAddress?: string | null;
  deliveryFee: number;
  paymentCode?: string | null;
  paymentExpiresAt?: string | null;
  isPaymentOverdue?: boolean;
  shippingAddress?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "MOMO" | "VNPAY";
  isPaid: boolean;
  note: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  voucherUsage?: { voucherId: string; voucher?: { code: string; title: string } } | null;
  transactions?: OrderTransaction[];
  bankTransferReferences?: Array<{ reference: string }>;
  customer?: { name: string; phone: string | null } | null;
  paymentIntents?: CounterSalePaymentIntent[];
}

export interface OrderTransaction {
  id: string;
  externalId: string | null;
  amount: number;
  receivedAmount: number | null;
  confirmedById: string | null;
  confirmedBy?: { id: string; name: string } | null;
  type: "FINAL_PAYMENT" | "REFUND";
  paymentMethod: "CASH" | "BANK_TRANSFER" | "MOMO" | "VNPAY";
  note: string | null;
  createdAt: string;
}

export interface CounterSalePaymentIntent {
  id: string;
  orderId: string;
  amount: number;
  paymentRef: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REVIEW";
  externalId?: string | null;
  receivedAmount: number | null;
  bankTransferReferences?: Array<{ reference: string }>;
  confirmedById: string | null;
  excessRefunded: boolean;
  expiresAt: string;
  order?: { code: string; source: "ONLINE" | "IN_STORE"; status: Order["status"]; isPaid: boolean };
}

export interface CounterSaleResult {
  order: Order;
  paymentIntent: CounterSalePaymentIntent | null;
  transferInfo: string | null;
}

export interface OrderListResponse {
  data: Order[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface OrderAdminSummary {
  total: number;
  unpaid: number;
  overdue: number;
  pending: number;
  completed: number;
  paidRevenue: number;
  pendingOrders: Array<Pick<Order, "id" | "code" | "status" | "total"> & { items: Array<{ id: string }> }>;
}

export interface CreateOrderPayload {
  items: { productId: string; quantity: number }[];
  fulfillmentMethod?: "PICKUP" | "DELIVERY";
  deliveryAreaId?: string;
  deliveryAddress?: string;
  expectedDeliveryFee?: number;
  shippingAddress?: string;
  contactName?: string;
  contactPhone?: string;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "MOMO" | "VNPAY";
  note?: string;
  voucherCode?: string;
  voucherId?: string;
}

export interface CreateCounterSalePayload {
  items: { productId: string; quantity: number }[];
  customerId?: string;
  voucherCode?: string;
  paymentMethod: "CASH" | "BANK_TRANSFER";
}

export function useOrderAdminSummary() {
  return useQuery({
    queryKey: ["orders", "admin", "summary"],
    queryFn: async () => apiClient.get<OrderAdminSummary>("/orders/admin/summary"),
  });
}

export const useMyOrders = () => {
  return useQuery({
    queryKey: ["orders", "me"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const res = await apiClient.get<Order[]>("/orders/me");
      return res;
    },
  });
};

export const useAllOrders = (params?: { status?: string; search?: string; page?: number; limit?: number; overdueOnly?: boolean }) => {
  return useQuery({
    queryKey: ["orders", "all", params],
    queryFn: async () => {
      const res = await apiClient.get<OrderListResponse>("/orders", {
        params: params as Record<string, string | number | undefined>,
      });
      return res;
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiClient.patch<Order>(`/orders/${id}/status?status=${status}`, {});
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export function useCancelOnlineOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, goodsReturned }: { id: string; reason: string; goodsReturned?: boolean }) => apiClient.post<Order>(`/orders/${id}/cancel`, { reason, goodsReturned }),
    onSuccess: (cancelledOrder) => {
      queryClient.setQueriesData<Order[]>({ queryKey: ["orders", "me"] }, (current) =>
        replaceItemById(current, cancelledOrder),
      );
      queryClient.setQueriesData<OrderListResponse>({ queryKey: ["orders", "all"] }, (current) =>
        replacePagedItemById(current, cancelledOrder),
      );
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });
}

export function useRecordOnlineOrderRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.post<Order>(`/orders/${id}/refund`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useConfirmOnlineOrderTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ConfirmBankTransferPayload & { orderId: string }) =>
      apiClient.post<Order>(`/orders/admin/${payload.orderId}/confirm-transfer`, {
        references: payload.references,
        receivedAmount: payload.receivedAmount,
        excessRefunded: payload.excessRefunded,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });
}

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderPayload) => {
      const idempotencyKey = getIdempotencyKey("online-order", data);
      const res = await apiClient.post<Order>("/orders", data, {
        headers: { "Idempotency-Key": idempotencyKey },
      });
      return res;
    },
    onSuccess: (_order, data) => {
      clearIdempotencyKey("online-order", data);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export function useCreateCounterSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCounterSalePayload) => {
      const idempotencyKey = getIdempotencyKey("counter-sale", data);
      return apiClient.post<CounterSaleResult>("/orders/in-store", data, {
        headers: { "Idempotency-Key": idempotencyKey },
      });
    },
    onSuccess: (_sale, data) => {
      clearIdempotencyKey("counter-sale", data);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useCounterSalePaymentIntent(intentId?: string, enabled = false) {
  return useQuery({
    queryKey: ["orders", "in-store-payment-intent", intentId],
    queryFn: async () => apiClient.get<CounterSalePaymentIntent>(`/orders/admin/in-store/payment-intents/${intentId}`),
    enabled: enabled && !!intentId,
    refetchInterval: (query) => query.state.data?.status === "PENDING" ? 3000 : false,
  });
}

export function useCancelCounterSalePaymentIntent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (intentId: string) => apiClient.post<CounterSalePaymentIntent>(`/orders/admin/in-store/payment-intents/${intentId}/cancel`, {}),
    onSuccess: (intent) => {
      queryClient.setQueryData(["orders", "in-store-payment-intent", intent.id], intent);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });
}

export function useConfirmCounterSaleTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ConfirmBankTransferPayload & { intentId: string }) =>
      apiClient.post<Order | { requiresSupport: true; intentId: string; orderCode: string }>(
        `/orders/admin/in-store/payment-intents/${payload.intentId}/confirm`,
        {
          references: payload.references,
          receivedAmount: payload.receivedAmount,
          excessRefunded: payload.excessRefunded,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}


