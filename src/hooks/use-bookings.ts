import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { ServiceItem } from "./use-services";
import { TimeSlotItem } from "./use-time-slots";
import { replaceItemById } from "@/lib/cancelled-query-cache";
import { clearIdempotencyKey, getIdempotencyKey } from "@/lib/idempotency-key";

export interface BookingServiceApplied {
  id: string;
  bookingId: string;
  serviceId: string;
  priceApplied: number;
  service: ServiceItem;
}

export interface TransactionItem {
  id: string;
  externalId?: string | null;
  bookingId?: string | null;
  orderId?: string | null;
  amount: number;
  careFeeAmount?: number;
  receivedAmount?: number | null;
  confirmedById?: string | null;
  note?: string | null;
  type: "DEPOSIT" | "FINAL_PAYMENT" | "REFUND";
  paymentMethod: "CASH" | "BANK_TRANSFER";
  proofUrl?: string | null;
  createdAt: string;
}

export interface BookingItem {
  id: string;
  code: string;
  type: "SPA";
  customerId: string;
  customer?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    loyaltyPoints: number;
  };
  petId: string;
  pet?: {
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
  };
  timeSlotId?: string | null;
  timeSlot?: TimeSlotItem | null;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED";
  startAt?: string | null;
  endAt?: string | null;
  extraPrice?: number;
  statusV2?: "BOOKED" | "ARRIVED" | "IN_SERVICE" | "READY_FOR_PICKUP" | "DONE" | "CANCELLED" | "NO_SHOW" | null;
  source?: "WEB" | "RECEPTIONIST" | "WALK_IN";
  spaBookingPromotionEligible?: boolean;
  pointsAwarded?: number;
  reminderSentAt?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  isPaid: boolean;
  latePickupFeeAmount?: number;
  latePickupFeeAssessedAt?: string | null;
  latePickupFeePaidAt?: string | null;
  assignedStaffId?: string | null;
  assignedStaff?: {
    id: string;
    name: string;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  statusLogs?: Array<{
    toStatus: "BOOKED" | "ARRIVED" | "IN_SERVICE" | "READY_FOR_PICKUP" | "DONE" | "CANCELLED" | "NO_SHOW";
    staffId: string | null;
    reason?: string | null;
    createdAt: string;
    action?: string;
    meta?: Record<string, unknown> | null;
  }>;
  waiverAcceptedAt?: string | null;
  staffNote?: string | null;
  createdAt: string;
  updatedAt: string;
  services: BookingServiceApplied[];
  transactions: TransactionItem[];
}

export interface BookingReweighQuote {
  supported: boolean;
  reason: string | null;
  weightKg: number;
  current: {
    subtotal: number;
    total: number;
  };
  proposed: {
    subtotal: number;
    total: number;
    sizeTierId: string;
    sizeTierName: string;
  } | null;
}

export interface AvailableSlotItem {
  time: string; // "08:00"
  available: boolean;
  remaining: number;
  unavailableReason?: "SHIFT_HANDOVER";
}

export interface AvailableSlotsResponse {
  date: string;
  slots: AvailableSlotItem[];
}

export interface BookingListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateBookingV2Payload {
  petId: string;
  serviceIds: string[];
  startAt: string; // ISO 8601 string
  customerId?: string;
  extraPrice?: number;
  staffNote?: string;
  source?: "WEB" | "RECEPTIONIST" | "WALK_IN";
  capacityOverrideReason?: string;
}

export interface CreateBookingPayload {
  type: "SPA";
  petId: string;
  serviceIds: string[];
  timeSlotId?: string;
  customerId?: string; // For staff reception
  staffNote?: string;
  assignedStaffId?: string;
}

export function useTodayBookings() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isStaffOrAdmin = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");

  return useQuery({
    queryKey: ["bookings", "today"],
    queryFn: async () => apiClient.get<BookingItem[]>("/bookings/today"),
    enabled: isStaffOrAdmin,
  });
}

export function useAllBookings(params?: {
  status?: string;
  statusFilter?: string;
  type?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  const isStaffOrAdmin = user?.role === "ADMIN" || user?.role === "STAFF";

  return useQuery({
    queryKey: ["bookings", "all", params],
    queryFn: async () => {
      return apiClient.get<{ data: BookingItem[]; meta: BookingListMeta }>("/bookings", {
        params: {
          status: params?.status,
          statusFilter: params?.statusFilter,
          type: params?.type,
          q: params?.q,
          dateFrom: params?.dateFrom,
          dateTo: params?.dateTo,
          page: params?.page,
          limit: params?.limit,
        },
      });
    },
    enabled: isStaffOrAdmin && params?.enabled !== false,
  });
}

export function useMyBookings(customEnabled: boolean = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["bookings", "me"],
    queryFn: async () => apiClient.get<BookingItem[]>("/bookings/me"),
    enabled: !!token && isAuthenticated && customEnabled,
  });
}

export function useBookingByCode(code?: string) {
  return useQuery({
    queryKey: ["bookings", "code", code],
    queryFn: async () => {
      if (!code) throw new Error("Booking code is required");
      return apiClient.get<BookingItem>(`/bookings/${code}`);
    },
    enabled: !!code,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const idempotencyKey = getIdempotencyKey("booking-v1", payload);
      return apiClient.post<BookingItem>("/bookings", payload, {
        headers: { "Idempotency-Key": idempotencyKey },
      });
    },
    onSuccess: (_booking, payload) => {
      clearIdempotencyKey("booking-v1", payload);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["time-slots"] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      staffNote,
      reason,
    }: {
      id: string;
      status: string;
      staffNote?: string;
      reason?: string;
    }) => {
      return apiClient.patch<BookingItem>(`/bookings/${id}/status`, {
        status,
        staffNote,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useUpdateBookingAddons() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      addServiceIds,
      removeBookingServiceIds,
    }: {
      id: string;
      addServiceIds?: string[];
      removeBookingServiceIds?: string[];
    }) => {
      return apiClient.patch<BookingItem>(`/bookings/${id}/services`, {
        addServiceIds,
        removeBookingServiceIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useAssignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, staffId }: { id: string; staffId: string }) => {
      return apiClient.patch<BookingItem>(`/bookings/${id}/assign-staff`, {
        staffId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      return apiClient.post<BookingItem>(`/bookings/${id}/cancel`, { reason });
    },
    onSuccess: (cancelledBooking) => {
      queryClient.setQueryData<BookingItem[]>(["bookings", "me"], (current) =>
        replaceItemById(current, cancelledBooking),
      );
      queryClient.setQueryData(["bookings", "code", cancelledBooking.code], cancelledBooking);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["transactions", "qr-intent", cancelledBooking.id] });
    },
  });
}

export function useAvailableSlots(params: {
  date: string;
  serviceIds: string[];
  source?: "WEB" | "RECEPTIONIST";
  petId?: string;
  sizeTierId?: string;
  weightKg?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["available-slots", params.source ?? "WEB", params.date, params.serviceIds, params.petId, params.sizeTierId, params.weightKg],
    queryFn: async () => {
      if (!params.date || !params.serviceIds?.length) return null;
      const endpoint = params.source === "RECEPTIONIST"
        ? "/bookings/available-slots/receptionist"
        : "/bookings/available-slots";
      return apiClient.get<AvailableSlotsResponse>(endpoint, {
        params: {
          date: params.date,
          serviceIds: params.serviceIds.join(","),
          ...(params.petId ? { petId: params.petId } : {}),
          ...(params.sizeTierId ? { sizeTierId: params.sizeTierId } : {}),
          ...(params.weightKg !== undefined ? { weightKg: params.weightKg } : {}),
        },
      });
    },
    enabled: params.enabled !== false && !!params.date && params.serviceIds.length > 0,
  });
}

export function useCreateBookingV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBookingV2Payload) => {
      const idempotencyKey = getIdempotencyKey("booking-v2", payload);
      return apiClient.post<BookingItem>("/bookings/v2", payload, {
        headers: { "Idempotency-Key": idempotencyKey },
      });
    },
    onSuccess: (_booking, payload) => {
      clearIdempotencyKey("booking-v2", payload);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["available-slots"] });
    },
  });
}

export function useUpdateBookingStatusV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      fromStatus,
      toStatus,
      staffNote,
      reason,
      extraPrice,
    }: {
      id: string;
      fromStatus: NonNullable<BookingItem["statusV2"]>;
      toStatus: NonNullable<BookingItem["statusV2"]>;
      staffNote?: string;
      reason?: string;
      extraPrice?: number;
    }) => {
      return apiClient.patch<BookingItem>(`/bookings/${id}/status-v2`, {
        fromStatus,
        toStatus,
        staffNote,
        reason,
        extraPrice,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCreateBookingReweighQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, weightKg }: { id: string; weightKg: number }) => {
      return apiClient.post<BookingReweighQuote>(`/bookings/${id}/reweigh/quote`, { weightKg });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });
}

export function useDecideBookingReweigh() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      weightKg,
      decision,
    }: {
      id: string;
      weightKg: number;
      decision: "ACCEPT" | "DECLINE";
    }) => {
      return apiClient.patch<BookingItem>(`/bookings/${id}/reweigh/decision`, {
        weightKg,
        decision,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["available-slots"] });
    },
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      newStartAt,
      reason,
    }: {
      id: string;
      newStartAt: string;
      reason?: string;
    }) => {
      return apiClient.patch<BookingItem>(`/bookings/${id}/reschedule`, {
        newStartAt,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["available-slots"] });
    },
  });
}
