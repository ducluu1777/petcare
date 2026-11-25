import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  stock: number;
  reservedStock?: number;
  category: string;
  suitableSpecies: "DOG" | "CAT" | null;
  imageUrl: string | null;
  isBestSeller: boolean;
  isNew: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  _count?: { orderItems: number; stockMovements?: number };
  stockMovements?: Array<{
    quantity: number;
    createdAt: string;
    performedBy: { name: string };
  }>;
  specifications?: Array<{ id: string; label: string; value: string }>;
  createdAt: string;
  updatedAt: string;
}

export type ProductStockMovementType = "OPENING_BALANCE" | "ADJUSTMENT";

export interface ProductStockMovement {
  id: string;
  type: ProductStockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  createdAt: string;
  performedBy: { id: string; name: string };
}

export interface AdminStockMovementPage {
  product: Pick<Product, "id" | "name" | "stock" | "reservedStock">;
  data: ProductStockMovement[];
  meta: ProductListMeta;
}

export type ProductUpdatePayload = Partial<Omit<
  Product,
  | "id"
  | "stock"
  | "reservedStock"
  | "createdAt"
  | "updatedAt"
  | "rating"
  | "reviewCount"
  | "_count"
  | "stockMovements"
  | "specifications"
>>;

export interface ProductStockAdjustmentPayload {
  quantity: number;
  reason: string;
}

export interface ProductListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductListResponse {
  data: Product[];
  meta: ProductListMeta;
}

export interface InventorySummary {
  total: number;
  lowStock: number;
  outOfStock: number;
  totalInventoryValue: number;
  restockProducts: Array<Pick<Product, "id" | "name" | "category" | "stock"> & { physicalStock: number }>;
}

export function useAdminProducts(params: {
  category?: string;
  search?: string;
  isActive?: boolean;
  page: number;
  limit: number;
  enabled?: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");
  const { enabled = true, ...queryParams } = params;

  return useQuery({
    queryKey: ["products", "admin", params],
    queryFn: async () => apiClient.get<ProductListResponse>("/products/admin/list", {
      params: queryParams as Record<string, string | number | boolean | undefined>,
    }),
    enabled: isStaffOrAdmin && enabled,
  });
}

export function useAdminInventorySummary() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["products", "admin", "summary"],
    queryFn: async () => apiClient.get<InventorySummary>("/products/admin/summary"),
    enabled: isStaffOrAdmin,
  });
}

export function useAdminProductStockMovements(
  productId: string | undefined,
  page: number,
  enabled = true,
) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["products", "admin", productId, "stock-movements", page],
    queryFn: async () => apiClient.get<AdminStockMovementPage>(
      `/products/admin/${productId}/stock-movements`,
      { params: { page, limit: 10 } },
    ),
    enabled: isStaffOrAdmin && !!productId && enabled,
  });
}

export const useAdjustProductStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: { id: string; data: ProductStockAdjustmentPayload }) => {
      return apiClient.post<{ product: Product; movement: ProductStockMovement }>(
        `/products/admin/${id}/stock-adjustments`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useProducts = (params?: {
  category?: string;
  species?: string;
  isBestSeller?: boolean;
  isNew?: boolean;
}) => {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const res = await apiClient.get<Product[] | ProductListResponse>("/products", { params });
      return Array.isArray(res) ? res : res.data || [];
    },
  });
};

export const useProduct = (idOrSlug: string) => {
  return useQuery({
    queryKey: ["products", idOrSlug],
    queryFn: async () => {
      const res = await apiClient.get<Product>(`/products/${idOrSlug}`);
      return res;
    },
    enabled: !!idOrSlug,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Product>) => {
      return apiClient.post<Product>("/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductUpdatePayload }) => {
      return apiClient.patch<Product>(`/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ message: string }>(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

