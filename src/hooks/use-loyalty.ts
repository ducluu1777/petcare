import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "EARN" | "REDEEM";
  description: string;
  refId: string | null;
  createdAt: string;
}

export function useMyLoyaltyHistory(enabled = true) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isCustomer = !!token && user?.role === "CUSTOMER";

  return useQuery({
    queryKey: ["loyalty", "history", user?.id],
    queryFn: async () => apiClient.get<LoyaltyTransaction[]>("/loyalty/history"),
    enabled: isCustomer && enabled,
  });
}

export function useUserLoyaltyHistory(userId: string) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["loyalty", "history", userId],
    queryFn: async () => apiClient.get<LoyaltyTransaction[]>(`/loyalty/history/${userId}`),
    enabled: isStaffOrAdmin && !!userId,
  });
}
