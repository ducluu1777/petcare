"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomerSiteFrame, CustomerSectionHeading } from "@/components/layout/customer-ui";
import { useServices } from "@/hooks/use-services";
import { ArrowRight } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { formatServicePriceTierLabel } from "@/lib/service-pricing";

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const { data: apiServices } = useServices();

  const customerServices = (apiServices || []);
  const services = customerServices.filter((s) => !s.isAddon);
  const addons = customerServices.filter((s) => s.isAddon);

  const filteredServices = services.filter((srv) => {
    if (activeCategory === "ALL") return true;
    if (activeCategory === "cat-spa") return srv.category === "CAT_SPA";
    return srv.category === activeCategory.toUpperCase();
  });

  const getServiceDetailUrl = (slug: string) => {
    return `/dich-vu/${slug}`;
  };

  const revealRef = useScrollReveal(".reveal-item", { y: 40, stagger: 0.1 });

  return (
    <CustomerSiteFrame containerRef={revealRef} className="selection:bg-[#244B3F] selection:text-white">
      <main className="flex-1 pb-24 sm:pb-28">
        <section className="service-collection-hero reveal-item">
          <div className="service-collection-hero__copy">
            <nav aria-label="Đường dẫn" className="customer-breadcrumbs"><Link href="/">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Dịch vụ</span></nav>
            <p className="customer-page-intro__eyebrow">Chăm sóc tại cửa hàng</p>
            <h1>Chăm bé thật dịu dàng, từ lúc đón đến khi về.</h1>
            <p>Chọn dịch vụ phù hợp cho bé. Giá trên website là mức tham khảo; nhân viên cân lại và xác nhận chi phí với bạn trước khi bắt đầu.</p>
            <Link href="/dat-lich" className="customer-primary-action">Đặt lịch chăm sóc <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <div className="service-collection-hero__visual">
            <img src="/images/spa-care-hero.jpg" alt="Chú chó được chải lông nhẹ nhàng trong không gian Spa" />
            <span className="customer-hero-image-caption">Hình ảnh minh họa</span>
          </div>
        </section>

        {/* ======================================= */}
        {/* EDITORIAL SERVICE LIST (Vertical 60/40) */}
        {/* ======================================= */}
        <section className="mx-auto mb-24 max-w-[1440px] px-5 sm:px-8 lg:px-14">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-10 border-b border-[#DEDAD0] pb-4 reveal-item">
            {[
              { id: "ALL", label: "Tất cả dịch vụ" },
              { id: "bath", label: "Tắm và vệ sinh" },
              { id: "grooming", label: "Cắt tỉa, tạo kiểu" },
              { id: "cat-spa", label: "Spa Mèo" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`min-h-11 border-b-2 px-1 text-sm font-semibold transition-colors ${
                  activeCategory === cat.id
                    ? "border-[#244B3F] text-[#244B3F]"
                    : "border-transparent text-[#65716A] hover:text-[#1B3C33]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="divide-y divide-[#DEDAD0]">
            {filteredServices.map((srv) => {
              return (
                <article
                  key={srv.id}
                  className="reveal-item grid min-w-0 grid-cols-1 gap-6 py-8 sm:py-10 lg:grid-cols-12 lg:gap-10"
                >
                  {/* Image 1/3 */}
                  <Link
                    href={getServiceDetailUrl(srv.slug)}
                    className="group/image relative block aspect-[1.45/1] min-w-0 overflow-hidden rounded-3xl bg-[#F0EEE6] lg:col-span-4 lg:aspect-[0.95/1]"
                  >
                    <img
                      src={srv.imageUrl || "/service-placeholder.svg"}
                      alt={srv.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-[1.035]"
                      onError={(event) => {
                        if (
                          !event.currentTarget.src.endsWith(
                            "/service-placeholder.svg",
                          )
                        ) {
                          event.currentTarget.src = "/service-placeholder.svg";
                        }
                      }}
                    />

                    {/* Badges */}
                    <div className="absolute left-4 top-4 flex flex-col gap-2">
                      {srv.isSignature && (
                        <div className="bg-[#E5ECE3] px-3 py-1.5 text-[10px] font-bold text-[#1B3C33]">
                          Dịch vụ chính
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Content 2/3 */}
                  <div className="flex min-w-0 flex-col lg:col-span-8">
                    <h2 className="mb-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#1B3C33] transition-colors hover:text-[#244B3F] sm:text-3xl">
                      <Link href={getServiceDetailUrl(srv.slug)}>
                        {srv.name}
                      </Link>
                    </h2>

                    <p className="mb-5 max-w-[62ch] text-sm leading-6 text-[#65716A] sm:text-base sm:leading-7">
                      {srv.description}
                    </p>

                    <div className="mb-6 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                      {/* Pricing Table */}
                      <div className="min-w-0 overflow-hidden border-y border-[#DEDAD0]">
                        <div className="border-b border-[#DEDAD0] py-3">
                          <span className="text-xs font-semibold text-[#244B3F]">
                            Bảng giá tham khảo
                          </span>
                        </div>
                        <div className="divide-y divide-[#DEDAD0]">
                          {srv.priceTiers?.slice(0, 4).map((tier, idx) => (
                            <div
                              key={idx}
                              className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5"
                            >
                              <span className="min-w-0 break-words text-xs font-medium text-[#65716A]">
                                {formatServicePriceTierLabel(
                                  tier,
                                  srv.priceTiers ?? [],
                                )}
                              </span>
                              <span className="shrink-0 text-sm font-semibold tabular-nums text-[#1B3C33]">
                                {formatVND(tier.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary Info */}
                      <div className="flex flex-col gap-3 justify-center">
                        {/* {srv.includes && srv.includes.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-[#65716A]">Bao gồm</span>
                            <ul className="space-y-1 text-sm text-[#253B33] font-medium">
                              {srv.includes.slice(0, 3).map((inc, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#244B3F]" />
                                  <span className="truncate">{inc}</span>
                                </li>
                              ))}
                              {srv.includes.length > 3 && (
                                <li className="text-xs text-[#65716A] pl-3.5">+ {srv.includes.length - 3} tiện ích khác...</li>
                              )}
                            </ul>
                          </div>
                        )} */}
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#DEDAD0] pt-5">
                      <Link
                        href={`/dat-lich?service=${srv.id}`}
                        className="inline-flex min-h-11 items-center gap-3 rounded-full bg-[#244B3F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1B3C33]"
                      >
                        Đặt lịch
                      </Link>
                      <Link
                        href={getServiceDetailUrl(srv.slug)}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#244B3F] hover:underline"
                      >
                        Xem chi tiết <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ======================================= */}
        {/* ADD-ONS SECTION (Grid) */}
        {/* ======================================= */}
        <section className="border-y border-[#DEDAD0] bg-[#F2EEE5] py-16 sm:py-20">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14">
            <CustomerSectionHeading
              className="mb-10 reveal-item"
              eyebrow="Có thể chọn thêm"
              title="Một chút chăm chút riêng cho bé."
              description="Bạn có thể chọn thêm khi đặt lịch. Nhân viên sẽ xác nhận hạng mục và chi phí trước khi thực hiện."
            />

            <div className="grid grid-cols-1 divide-y divide-[#DEDAD0] md:grid-cols-2 md:divide-y-0 md:gap-x-10">
              {addons.map((addon) => (
                <article
                  key={addon.id}
                  className="reveal-item flex min-w-0 items-start justify-between gap-4 py-5"
                >
                  <div>
                    <h3 className="font-semibold text-[#1B3C33]">
                      {addon.name}
                    </h3>
                    <p className="mt-2 max-w-[48ch] text-sm leading-5 text-[#65716A]">
                      {addon.description}
                    </p>
                  </div>
                  <div className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-[#244B3F]">
                    +{formatVND(addon.priceTiers?.[0]?.price || 0)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </CustomerSiteFrame>
  );
}
