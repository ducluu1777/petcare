import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface TimeSlotItem {
  id: string;
  slotDate: string;
  slotTime: string;
  period: "MORNING" | "AFTERNOON";
  capacity: number;
  booked: number;
}

export interface ShopScheduleSettings {
  capacity: number;
  latePickupFeeAmount: number;
  openHours: Record<string, { open: string; close: string } | null>;
  holidays: string[];
}

export function useShopScheduleSettings(enabled = true) {
  return useQuery({
    queryKey: ["shop-schedule-settings"],
    queryFn: () => apiClient.get<ShopScheduleSettings>("/bookings/settings"),
    enabled,
  });
}

export function useUpdateShopScheduleSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: ShopScheduleSettings) =>
      apiClient.patch<ShopScheduleSettings>("/bookings/settings", settings),
    onSuccess: async (settings) => {
      queryClient.setQueryData(["shop-schedule-settings"], settings);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shop-schedule-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["time-slots"] }),
      ]);
    },
  });
}

export function useTimeSlots(date?: string) {
  return useQuery({
    queryKey: ["time-slots", date],
    queryFn: async () => {
      if (!date) return [];
      return apiClient.get<TimeSlotItem[]>("/time-slots/available", {
        params: { date },
      });
    },
    enabled: !!date,
  });
}

export function useAdminTimeSlots(from: string, to: string) {
  return useQuery({
    queryKey: ["time-slots", "admin", from, to],
    queryFn: () => apiClient.get<TimeSlotItem[]>("/time-slots/admin", { params: { from, to } }),
    enabled: !!from && !!to,
  });
}

export function useCreateTimeSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slots: Array<Pick<TimeSlotItem, "slotDate" | "slotTime" | "period"> & { capacity?: number }>) =>
      apiClient.post<TimeSlotItem[]>("/time-slots/bulk", { slots }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-slots"] }),
  });
}

export function useUpdateTimeSlotCapacity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, capacity }: { id: string; capacity: number }) =>
      apiClient.patch<TimeSlotItem>(`/time-slots/${id}`, { capacity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-slots"] }),
  });
}

export function useDeleteTimeSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ message: string }>(`/time-slots/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-slots"] }),
  });
}
