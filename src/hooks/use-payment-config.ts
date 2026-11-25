import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { SepayAccountConfig, SepayChannel } from "@/lib/payment-config";

export function useSepayAccountConfig(channel: SepayChannel) {
  return useQuery({
    queryKey: ["payment", "sepay-account", channel],
    queryFn: async () => apiClient.get<SepayAccountConfig>(`/payment/qr-config?channel=${channel}`),
  });
}

export type { SepayAccountConfig, SepayChannel } from "@/lib/payment-config";
