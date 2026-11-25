"use client";

import { use } from "react";
import Link from "next/link";
import { CustomerSiteFrame } from "@/components/layout/customer-ui";
import { useService } from "@/hooks/use-services";
import { ChevronRight, Loader2 } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { formatServicePriceTierLabel } from "@/lib/service-pricing";
import { getDisplayLabel } from "@/lib/domain-labels";

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { data: service, isLoading } = useService(resolvedParams.slug);
  const revealRef = useScrollReveal(".reveal-item", { y: 30, stagger: 0.1 });

  if (isLoading) {
    return (
      <CustomerSiteFrame>
        <main className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="size-9 animate-spin text-[#244B3F]" aria-label="Đang tải dịch vụ" />
        </main>
      </CustomerSiteFrame>
    );
  }

  if (!service) {
    return (
      <CustomerSiteFrame>
        <main className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
          <h1 className="text-2xl font-bold text-[#253B33] mb-4">Không tìm thấy dịch vụ</h1>
          <Link href="/dich-vu" className="text-[#244B3F] underline">Quay lại danh sách dịch vụ</Link>
        </main>
      </CustomerSiteFrame>
    );
  }

  return (
    <CustomerSiteFrame containerRef={revealRef}>
      <main className="flex-1">
        {/* Breadcrumbs & Hero */}
        <section className="border-b border-[#DEDAD0] py-8 sm:py-12 reveal-item">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-14">
            <div className="flex items-center gap-2 text-xs text-[#65716A] mb-6">
              <Link href="/" className="hover:text-[#244B3F] transition-colors">Trang chủ</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/dich-vu" className="hover:text-[#244B3F] transition-colors">Dịch vụ</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="truncate font-medium text-[#1B3C33]">{service.name}</span>
            </div>

            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-14">
              <div className="space-y-5 lg:col-span-7 lg:py-8">
                <div className="text-xs font-semibold text-[#244B3F]">
                  {getDisplayLabel("serviceCategory", service.category)}
                </div>

                <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-[#1B3C33] sm:text-5xl lg:text-6xl">
                  {service.name}
                </h1>

                <p className="max-w-[55ch] text-base leading-7 text-[#65716A] sm:text-lg sm:leading-8">
                  {service.tagline}
                </p>

                <p className="max-w-[60ch] text-sm leading-6 text-[#65716A]">
                  {service.description}
                </p>

                {/* Transparency Commitment Box */}
                <div className="max-w-[58ch] border-l-2 border-[#8A9A7A] py-1 pl-4 text-sm leading-6 text-[#65716A]">
                  <div className="font-semibold text-[#1B3C33]">Giá sẽ được xác nhận trước khi thực hiện.</div>
                  <p>
                    Mức giá hiển thị là tạm tính theo cân nặng bạn khai. Nhân viên cân lại và xác nhận giá với bạn trước khi bắt đầu dịch vụ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <a
                    href="#bang-gia-goi"
                  className="btn-tactile inline-flex min-h-12 items-center justify-center rounded-full bg-[#244B3F] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1B3C33]"
                  >
                    Xem bảng giá
                  </a>
                  <Link
                    href={`/dat-lich?service=${service.id}`}
                  className="btn-tactile inline-flex min-h-12 items-center justify-center rounded-full border border-[#D4D0C6] px-6 text-sm font-semibold text-[#1B3C33] transition-colors hover:border-[#244B3F] hover:text-[#244B3F]"
                  >
                    Đặt lịch
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="relative aspect-[1.2/1] overflow-hidden rounded-3xl bg-[#F0EEE6] sm:aspect-[1.05/1]">
                  <img
                    src={service.imageUrl || "/service-placeholder.svg"}
                    alt={service.name}
                    className="w-full h-full object-cover"
                    onError={(event) => {
                      if (!event.currentTarget.src.endsWith("/service-placeholder.svg")) {
                        event.currentTarget.src = "/service-placeholder.svg";
                      }
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1B3C33]/80 to-transparent px-5 pb-5 pt-14 text-sm leading-5 text-white sm:px-6 sm:pb-6">
                    Thời gian chăm sóc thực tế có thể thay đổi. Nhân viên sẽ báo bạn khi thú cưng sẵn sàng đón.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing by weight tier */}
        <section id="bang-gia-goi" className="border-b border-[#DEDAD0] bg-[#F0EEE6] py-16 sm:py-20 reveal-item">
          <div className="mx-auto max-w-[920px] px-5 sm:px-8">
            <div className="text-center space-y-3 mb-10">
              <span className="text-xs font-semibold text-[#244B3F]">
                Bảng giá tham khảo theo cân nặng
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.04em] text-[#1B3C33] sm:text-4xl">
                Ước lượng chi phí theo cân nặng
              </h2>
              <p className="text-sm text-[#65716A] max-w-xl mx-auto">
                Các mốc giá giúp bạn ước lượng chi phí trước. Nhân viên sẽ cân lại và xác nhận giá trước khi thực hiện.
              </p>
            </div>

            <div className="overflow-hidden border-y border-[#DEDAD0]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#DEDAD0] text-[#1B3C33] text-xs font-semibold">
                    <tr>
                      <th className="py-4 px-6">Cân nặng / Tùy chọn</th>
                      <th className="py-4 px-6">Giá tham khảo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DEDAD0]">
                    {service.priceTiers?.map((tier, idx) => (
                      <tr key={idx}>
                        <td className="py-4 px-4 font-medium text-[#65716A] sm:px-6">
                          {formatServicePriceTierLabel(tier, service.priceTiers ?? [])}
                        </td>
                        <td className="py-4 px-4 font-semibold tabular-nums text-[#1B3C33] sm:px-6">
                          {formatVND(tier.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-[#DEDAD0] py-4 text-xs leading-5 text-[#65716A]">
                Giá trên chưa bao gồm phụ thu lông rối nặng hoặc thú cưng đặc biệt khó hợp tác. Tiệm luôn báo giá trước khi làm.
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <Link
                href={`/dat-lich?service=${service.id}`}
                className="btn-tactile inline-flex min-h-12 items-center rounded-full bg-[#244B3F] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#1B3C33]"
              >
                Đặt lịch
              </Link>
            </div>
          </div>
        </section>

      </main>

    </CustomerSiteFrame>
  );
}
