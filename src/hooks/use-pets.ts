import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export interface PetItem {
  id: string;
  name: string;
  species: "DOG" | "CAT";
  breed: string;
  weightKg: number;
  ageMonths?: number | null;
  behavioralFlag: "NORMAL" | "AGGRESSIVE" | "TIMID";
  hasVaccine: boolean;
  avatarUrl?: string | null;
  notes?: string | null;
  nextSpaDate?: string | null;
  nextSpaReminder?: string | null;
  archivedAt?: string | null;
  userId: string;
  user?: { id: string; name: string; phone: string | null; email: string | null };
  bookings?: Array<{
    id: string;
    code: string;
    createdAt: string;
    startAt?: string | null;
    status: string;
    statusV2?: string | null;
    timeSlot?: { slotDate: string; slotTime: string } | null;
    services: Array<{ service?: { name: string } }>;
  }>;
  _count?: { bookings: number };
}

export interface CreatePetPayload {
  name?: string;
  species: "DOG" | "CAT";
  breed: string;
  weightKg: number;
  ageMonths?: number | null;
  avatarUrl?: string;
  behavioralFlag?: "NORMAL" | "AGGRESSIVE" | "TIMID";
  hasVaccine?: boolean;
  notes?: string;
  userId?: string;
}

export function useMyPets(customEnabled: boolean = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ["pets", "me"],
    queryFn: async () => apiClient.get<PetItem[]>("/pets/me"),
    enabled: !!token && isAuthenticated && customEnabled,
  });
}

export function useCreatePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePetPayload) => {
      return apiClient.post<PetItem>("/pets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdatePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreatePetPayload> }) => {
      return apiClient.patch<PetItem>(`/pets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });
}

export function useDeletePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ message: string }>(`/pets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });
}

export function useArchivePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => apiClient.patch<PetItem>(`/pets/${id}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useRestorePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => apiClient.patch<PetItem>(`/pets/${id}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAllPets() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["pets", "all"],
    queryFn: async () => apiClient.get<PetItem[]>("/pets"),
    enabled: isStaffOrAdmin,
  });
}

export function useUpdateBehavioralFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      flag,
    }: {
      id: string;
      flag: "NORMAL" | "AGGRESSIVE" | "TIMID";
    }) => {
      return apiClient.patch<PetItem>(`/pets/${id}/behavioral-flag`, { behavioralFlag: flag });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });
}
