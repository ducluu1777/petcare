"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { bindCartToAccount, useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    void useCartStore.persist?.rehydrate();
    return bindCartToAccount(useCartStore, useAuthStore.subscribe);
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
