import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface DeliveryArea {
  id: string;
  province: string;
  ward: string;
  fee: number;
  isActive: boolean;
}

export type DeliveryAreaInput = Omit<DeliveryArea, "id">;

export function useActiveDeliveryAreas() {
  return useQuery({
    queryKey: ["delivery-areas", "active"],
    queryFn: () => apiClient.get<DeliveryArea[]>("/delivery-areas"),
  });
}

export function useAdminDeliveryAreas() {
  return useQuery({
    queryKey: ["delivery-areas", "admin"],
    queryFn: () => apiClient.get<DeliveryArea[]>("/delivery-areas/admin"),
  });
}

export function useSaveDeliveryArea() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: DeliveryAreaInput & { id?: string }) => {
      const { id, ...data } = input;
      return id
        ? apiClient.patch<DeliveryArea>(`/delivery-areas/${id}`, data)
        : apiClient.post<DeliveryArea>("/delivery-areas", data);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["delivery-areas"] });
    },
  });
}
