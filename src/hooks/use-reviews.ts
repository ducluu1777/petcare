import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export interface ReviewItem {
  id: string;
  authorId: string;
  targetType: "SERVICE" | "PRODUCT";
  targetId: string;
  targetName?: string | null;
  rating: number;
  comment: string;
  isHidden?: boolean;
  moderationReason?: string | null;
  moderatedAt?: string | null;
  moderatedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface ModerateReviewPayload {
  isHidden: boolean;
  reason: string;
}

export interface CreateReviewPayload {
  targetType: "SERVICE" | "PRODUCT";
  targetId: string;
  rating: number;
  comment: string;
}

export function useMyReviews(customEnabled: boolean = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["reviews", "me"],
    queryFn: async () => apiClient.get<ReviewItem[]>("/reviews/me"),
    enabled: !!token && isAuthenticated && customEnabled,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      return apiClient.post<ReviewItem>("/reviews", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useAllReviews(params?: { targetType?: "SERVICE" | "PRODUCT"; targetId?: string }) {
  return useQuery({
    queryKey: ["reviews", "all", params],
    queryFn: async () => {
      const res = await apiClient.get<ReviewItem[]>("/reviews", { params });
      return res;
    },
  });
}

export function useAdminReviews() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["reviews", "admin"],
    queryFn: async () => apiClient.get<ReviewItem[]>("/reviews/admin"),
    enabled: isStaffOrAdmin,
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ModerateReviewPayload }) =>
      apiClient.patch<ReviewItem>(`/reviews/${id}/moderation`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}


