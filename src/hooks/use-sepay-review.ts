import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SepayReviewEvent {
  id: string;
  paymentCode: string | null;
  accountNumber: string | null;
  transferType: string | null;
  amount: number;
  referenceCode: string | null;
  reason: string | null;
  createdAt: string;
  order: { id: string; code: string; total: number; isPaid: boolean; status: string } | null;
  booking: { id: string; code: string; total: number; isPaid: boolean; status: string } | null;
}

export function useSepayReview(id?: string | null) {
  return useQuery({
    queryKey: ["sepay-review", id || "all"],
    queryFn: () => apiClient.get<SepayReviewEvent[]>(`/payment/sepay/review${id ? `?id=${encodeURIComponent(id)}` : ""}`),
    refetchInterval: 30000,
  });
}

export function useCompleteSepayReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => apiClient.post(`/payment/sepay/review/${id}/complete`, { note }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sepay-review"] }),
  });
}
