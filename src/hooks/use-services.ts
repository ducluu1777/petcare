import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ServicePriceTier {
  id: string;
  serviceId: string;
  minWeight: number;
  maxWeight: number;
  price: number;
  label: string;
  species: "DOG" | "CAT" | null;
}

export interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: "BATH" | "GROOMING" | "CAT_SPA";
  isPopular: boolean;
  isSignature: boolean;
  isAddon: boolean;
  requiresVaccination: boolean;
  isActive: boolean;
  imageUrl?: string | null;
  priceTiers: ServicePriceTier[];
  _count?: { bookingServices: number };
}

export interface CalculatePriceResult {
  serviceId: string;
  serviceName: string;
  petId: string | null;
  petName: string | null;
  weightKg: number;
  tierLabel: string;
  priceApplied: number;
}

export function useServices(category?: string, isAddon?: boolean) {
  return useQuery({
    queryKey: ["services", { category, isAddon }],
    queryFn: async () => {
      const params: Record<string, string | boolean> = {};
      if (category) params.category = category;
      if (isAddon !== undefined) params.isAddon = isAddon;
      return apiClient.get<ServiceItem[]>("/services", { params });
    },
  });
}

export function useAdminServices(isActive?: boolean) {
  return useQuery({
    queryKey: ["services", "admin", { isActive }],
    queryFn: async () => apiClient.get<ServiceItem[]>("/services/admin/list", {
      params: isActive === undefined ? undefined : { isActive },
    }),
  });
}

export function useService(idOrSlug: string) {
  return useQuery({
    queryKey: ["services", idOrSlug],
    queryFn: async () => {
      return apiClient.get<ServiceItem>(`/services/${idOrSlug}`);
    },
    enabled: !!idOrSlug,
  });
}

export function useCalculatePrice(params: {
  serviceId?: string;
  petId?: string;
  weightKg?: number;
  species?: "DOG" | "CAT";
  enabled?: boolean;
}) {
  const { serviceId, petId, weightKg, species, enabled = true } = params;

  return useQuery({
    queryKey: ["calculate-price", { serviceId, petId, weightKg, species }],
    queryFn: async () => {
      if (!serviceId) throw new Error("serviceId is required");
      const queryParams: Record<string, string | number> = { serviceId };
      if (petId) queryParams.petId = petId;
      if (weightKg !== undefined) queryParams.weightKg = weightKg;
      if (species) queryParams.species = species;

      return apiClient.get<CalculatePriceResult>("/services/calculate-price", {
        params: queryParams,
      });
    },
    enabled: enabled && !!serviceId && (!!petId || (weightKg !== undefined && Number.isFinite(weightKg) && weightKg >= 0)),
  });
}

export interface CreatePriceTierPayload {
  minWeight: number;
  maxWeight: number;
  price: number;
  label: string;
  species?: "DOG" | "CAT";
}

export interface CreateServicePayload {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: "BATH" | "GROOMING" | "CAT_SPA";
  isPopular?: boolean;
  isSignature?: boolean;
  isAddon?: boolean;
  requiresVaccination?: boolean;
  imageUrl?: string;
  priceTiers: CreatePriceTierPayload[];
}

export interface UpdateServicePayload {
  name?: string;
  tagline?: string;
  description?: string;
  category?: "BATH" | "GROOMING" | "CAT_SPA";
  isPopular?: boolean;
  isSignature?: boolean;
  isAddon?: boolean;
  requiresVaccination?: boolean;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateServiceWithPriceTiersPayload {
  id: string;
  data: UpdateServicePayload;
  priceTiers: CreatePriceTierPayload[];
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateServicePayload) => apiClient.post<ServiceItem>("/services", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServicePayload }) =>
      apiClient.patch<ServiceItem>(`/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useUpdateServiceWithPriceTiers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, priceTiers }: UpdateServiceWithPriceTiersPayload) =>
      apiClient.patch<ServiceItem>(`/services/${id}`, { ...data, priceTiers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useSetPriceTiers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priceTiers }: { id: string; priceTiers: CreatePriceTierPayload[] }) =>
      apiClient.put<ServiceItem>(`/services/${id}/price-tiers`, { priceTiers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

