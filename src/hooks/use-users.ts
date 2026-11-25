import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { AuthUser, useAuthStore } from "@/stores/auth-store";

export interface PetSummary {
  id: string;
  name: string;
  species: "DOG" | "CAT";
  breed: string;
  weightKg: number;
  avatarUrl?: string | null;
}

export interface UserListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "CUSTOMER" | "STAFF" | "ADMIN";
  loyaltyPoints: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    pets: number;
    bookings: number;
    orders: number;
  };
  pets?: PetSummary[];
}

export interface UserListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserStats {
  total: number;
  customers: number;
  staff: number;
  admins: number;
}

export function useUsersList(params?: {
  phone?: string;
  role?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}, customEnabled: boolean = true) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["users", "list", params],
    queryFn: async () => {
      return apiClient.get<{ data: UserListItem[]; meta: UserListMeta }>("/users", {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
    },
    enabled: isStaffOrAdmin && customEnabled,
  });
}

export function useUserStats() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["users", "stats"],
    queryFn: async () => apiClient.get<UserStats>("/users/stats"),
    enabled: isStaffOrAdmin,
  });
}

export function useUserDetail(id?: string) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: async () => {
      if (!id) throw new Error("User ID is required");
      return apiClient.get<UserListItem>(`/users/${id}`);
    },
    enabled: isStaffOrAdmin && !!id,
  });
}

export function useSearchUserByPhone(phone?: string) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["users", "search-phone", phone],
    queryFn: async () => {
      if (!phone || phone.length < 3) return [];
      const res = await apiClient.get<{ data: UserListItem[]; meta: UserListMeta }>("/users", {
        params: { phone, role: "CUSTOMER", isActive: true },
      });
      return res.data || [];
    },
    enabled: isStaffOrAdmin && !!phone && phone.length >= 3,
  });
}

export function useUserProfile(customEnabled: boolean = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["users", "me"],
    queryFn: async () => apiClient.get<AuthUser>("/users/me"),
    enabled: !!token && isAuthenticated && customEnabled,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "CUSTOMER" | "STAFF" | "ADMIN";
    }) => {
      return apiClient.patch<UserListItem>(`/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const fetchProfile = useAuthStore.getState().fetchProfile;

  return useMutation({
    mutationFn: async (data: { name?: string; phone?: string; avatarUrl?: string }) => {
      return apiClient.patch<AuthUser>("/users/me", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      fetchProfile();
    },
  });
}

export function useAdjustUserPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      points,
      reason,
    }: {
      userId: string;
      points: number;
      reason: string;
    }) => {
      return apiClient.patch<UserListItem>(`/users/${userId}/points`, { points, reason });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty", "history", variables.userId] });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      return apiClient.patch<UserListItem>(`/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: { name?: string; email?: string; phone?: string; loyaltyPoints?: number };
    }) => {
      return apiClient.patch<{ message: string; user: UserListItem }>(`/users/${userId}/admin-update`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useSoftDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return apiClient.patch<{ message: string }>(`/users/${userId}/soft-delete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUserAuditLogs(userId: string) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["users", "audit-logs", userId],
    queryFn: async () => {
      return apiClient.get<Array<{
        id: string;
        action: string;
        details: unknown;
        createdAt: string;
        performedById: string;
        performedBy: { name: string; email: string | null };
      }>>(`/users/${userId}/audit-logs`);
    },
    enabled: isStaffOrAdmin && !!userId,
  });
}

