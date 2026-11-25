import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { VoucherPerAccountUsageLimit } from "@/lib/admin-voucher-types";

export interface VoucherItem {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscount?: number | null;
  minSpend: number;
  pointCost?: number | null;
  expiryDate: string;
  isActive: boolean;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usageCount?: number;
}

export interface VoucherValidationResult {
  valid: boolean;
  voucherId: string;
  code: string;
  title: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  discount: number;
  totalAfterDiscount: number;
}

export interface CreateVoucherPayload {
  code: string;
  title: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscount?: number;
  minSpend: number;
  pointCost?: number;
  usageLimitPerUser?: VoucherPerAccountUsageLimit;
  expiryDate: string;
}

export type UpdateVoucherPayload = Partial<Pick<VoucherItem, "isActive" | "expiryDate" | "usageLimit" | "usageLimitPerUser">>;

export interface SpaBookingPromotion {
  active: boolean;
}

export function useSpaBookingPromotion() {
  return useQuery({
    queryKey: ["spa-booking-promotion"],
    queryFn: () => apiClient.get<SpaBookingPromotion>("/bookings/settings/spa-booking-promotion"),
  });
}

export function useUpdateSpaBookingPromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (active: boolean) =>
      apiClient.patch<SpaBookingPromotion>("/bookings/settings/spa-booking-promotion", { active }),
    onSuccess: async (promotion) => {
      queryClient.setQueryData(["spa-booking-promotion"], promotion);
      await queryClient.invalidateQueries({ queryKey: ["spa-booking-promotion"] });
    },
  });
}

export function useMyVouchers(customEnabled: boolean = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["vouchers", "me"],
    queryFn: async () => apiClient.get<VoucherItem[]>("/vouchers/me"),
    enabled: !!token && isAuthenticated && customEnabled,
  });
}

export function useCustomerVouchers(customerId?: string) {
  return useQuery({
    queryKey: ["vouchers", "customer", customerId],
    queryFn: async () => apiClient.get<VoucherItem[]>(`/vouchers/customer/${customerId}`),
    enabled: !!customerId,
  });
}

export function useRewardVouchers() {
  return useQuery({
    queryKey: ["vouchers", "rewards"],
    queryFn: async () => apiClient.get<VoucherItem[]>("/vouchers/rewards"),
  });
}

export function useRedeemVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voucherCode: string) => {
      return apiClient.post<{ message?: string; voucherUsage?: unknown }>("/vouchers/redeem", {
        voucherCode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty", "history"] });
    },
  });
}

export function useValidateVoucher() {
  return useMutation({
    mutationFn: async ({ code, orderTotal }: { code: string; orderTotal: number }) => {
      return apiClient.post<VoucherValidationResult>("/vouchers/validate", {
        code,
        orderTotal,
      });
    },
  });
}

export function useAllVouchers() {
  const { user, token } = useAuthStore();
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["vouchers", "all"],
    queryFn: async () => apiClient.get<VoucherItem[]>("/vouchers"),
    enabled: isStaffOrAdmin,
  });
}

export function useCreateVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateVoucherPayload) => {
      return apiClient.post<VoucherItem>("/vouchers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });
}

export function useUpdateVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVoucherPayload }) => {
      return apiClient.patch<VoucherItem>(`/vouchers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });
}

