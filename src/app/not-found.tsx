import Link from "next/link";
import { ArrowLeft, House } from "lucide-react";
import { CustomerSiteFrame } from "@/components/layout/customer-ui";

export default function NotFound() {
  return (
    <CustomerSiteFrame>
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-5 py-20 sm:px-8 lg:px-14">
        <p className="font-[family-name:var(--font-display)] text-7xl font-semibold tracking-[-0.08em] text-[#244B3F] sm:text-8xl">404</p>
        <h1 className="mt-4 max-w-[12ch] font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight tracking-[-0.05em] text-[#1B3C33] sm:text-5xl">Trang này chưa tìm thấy.</h1>
        <p className="mt-4 max-w-[50ch] text-sm leading-6 text-[#65716A] sm:text-base">Có thể địa chỉ đã thay đổi. Bạn có thể quay về trang chủ hoặc xem các dịch vụ đang có.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#244B3F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1B3C33]"><House className="size-4" />Về trang chủ</Link>
          <Link href="/dich-vu" className="inline-flex min-h-12 items-center gap-3 rounded-full border border-[#D4D0C6] px-5 text-sm font-semibold text-[#1B3C33] transition-colors hover:border-[#244B3F] hover:text-[#244B3F]"><ArrowLeft className="size-4" />Xem dịch vụ</Link>
        </div>
      </main>
    </CustomerSiteFrame>
  );
}
