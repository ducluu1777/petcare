import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export interface RecoverableCustomerAccount {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  deletedAt: string;
  createdAt: string;
}

interface RecoverableAccountsResponse {
  data: RecoverableCustomerAccount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useRecoverableCustomerAccounts(params: {
  search?: string;
  page: number;
  limit: number;
}) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["users", "recoverable", params],
    queryFn: async () => apiClient.get<RecoverableAccountsResponse>("/users/recoverable", {
      params: params as Record<string, string | number | undefined>,
    }),
    enabled: isStaffOrAdmin,
  });
}

export function useRestoreCustomerAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) =>
      apiClient.patch<{ message: string }>(`/users/${userId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
