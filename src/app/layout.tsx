import type { Metadata } from "next";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "PetCare — Spa và chăm sóc thú cưng tại Hà Nội",
  description: "Dịch vụ tắm Spa, cắt tỉa và chăm sóc thú cưng tại Hà Nội.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
};

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/providers/query-provider";
import { FloatingContact } from "@/components/layout/FloatingContact";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#FAFAF7] text-[#1A1F1E] font-[family-name:var(--font-petcare-body)]">
        <QueryProvider>
          <SmoothScroll>
            <TooltipProvider>
              {children}
              <FloatingContact />
              <Toaster position="top-center" richColors />
            </TooltipProvider>
          </SmoothScroll>
        </QueryProvider>
      </body>
    </html>
  );
}
