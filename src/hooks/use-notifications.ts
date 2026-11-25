import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "SYSTEM" | "BOOKING" | "ORDER" | "LOYALTY" | "REMINDER" | "PROMO";
  isRead: boolean;
  refId?: string | null;
  createdAt: string;
}

export function useNotifications() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      return apiClient.get<AppNotification[]>("/notifications");
    },
    enabled: !!isAuthenticated && !!token,
    refetchInterval: 30000, // Poll every 30s for real-time updates
  });
}

export function useUnreadNotificationsCount() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await apiClient.get<{ count: number }>("/notifications/unread-count");
      return res.count;
    },
    enabled: !!isAuthenticated && !!token,
    refetchInterval: 20000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch<AppNotification>(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.patch<{ count: number }>("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
