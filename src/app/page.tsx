"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CustomerSiteFrame } from "@/components/layout/customer-ui";
import { useServices } from "@/hooks/use-services";
import { useProducts } from "@/hooks/use-products";
import { useAllReviews } from "@/hooks/use-reviews";
import { formatVND } from "@/lib/utils";
import { getProductDetailHref } from "@/lib/product-detail-url";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const careSteps = [
  ["Chọn giờ cho bé", "Bạn chọn hồ sơ thú cưng, dịch vụ và khung giờ còn chỗ trên website."],
  ["Trao đổi khi đến tiệm", "Nhân viên lắng nghe thói quen của bé, cân lại và báo giá thực tế."],
  ["Chăm sóc sau khi bạn đồng ý", "PetCare bắt đầu khi bạn đã thống nhất hạng mục và chi phí."],
  ["Nhắn bạn đến đón", "Khi bé sẵn sàng, nhân viên báo để bạn chủ động sắp xếp thời gian."],
] as const;

const commonQuestions = [
  ["Giá dịch vụ được tính thế nào?", "Giá trên web tính theo cân nặng ước tính. Khi bé đến, nhân viên cân lại, báo giá và chỉ bắt đầu khi bạn đồng ý."],
  ["Khi nào tôi thanh toán?", "Bạn thanh toán tại quầy lúc đón bé. PetCare sẽ nhắn khi bé đã sẵn sàng."],
  ["Tôi nhận hàng bằng cách nào?", "Bạn có thể lấy hàng tại cửa hàng hoặc chọn giao trong khu vực PetCare phục vụ. Phí giao được báo trước khi thanh toán."],
] as const;

export default function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { data: apiServices, isLoading: servicesLoading } = useServices();
  const { data: apiProducts, isLoading: productsLoading } = useProducts();
  const { data: apiReviews } = useAllReviews();
  const services = (apiServices || []).filter((service) => !service.isAddon).slice(0, 3);
  const products = (apiProducts || []).slice(0, 4);
  const review = (apiReviews || []).find((item) => !item.isHidden && item.comment.trim().length > 0);

  useGSAP(() => {
    const motion = gsap.matchMedia();
    motion.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(".home-next-hero__copy > *", { y: 22, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, duration: 0.75, stagger: 0.09, ease: "power2.out",
      });
      gsap.fromTo(".home-next-hero__visual img", { scale: 1.06 }, {
        scale: 1, duration: 1.1, ease: "power2.out",
      });
      gsap.utils.toArray<HTMLElement>(".home-next-reveal").forEach((element) => {
        gsap.fromTo(element, { y: 28, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out",
          scrollTrigger: { trigger: element, start: "top 88%", once: true },
        });
      });
    });
    return () => motion.revert();
  }, { scope: pageRef });

  return (
    <CustomerSiteFrame containerRef={pageRef}>
      <main className="home-next">
        <section className="home-next-hero" aria-labelledby="home-title">
          <div className="home-next-hero__copy">
            <p className="home-next-eyebrow">Spa và cửa hàng thú cưng</p>
            <h1 id="home-title">Chăm bé ở PetCare.</h1>
            <p className="home-next-hero__description">Đặt lịch Spa, xem dịch vụ và mua sản phẩm cho bé. Bạn cũng có thể gọi PetCare nếu cần hỏi thêm.</p>
            <div className="home-next-hero__actions">
              <Link href="/dat-lich" className="customer-primary-action">Đặt lịch cho bé <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
              <Link href="/dich-vu" className="customer-secondary-action">Xem dịch vụ và giá <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="home-next-hero__visual">
            <img src="/images/home-companion-hero.jpg" alt="Người nuôi âu yếm chú chó nhỏ trong không gian ấm áp" />
            <span>Hình ảnh minh họa</span>
          </div>
        </section>

        <section className="home-next-entry" aria-label="Khám phá PetCare">
          <div className="home-next-entry__lead home-next-reveal">
            <p className="home-next-eyebrow">PetCare</p>
            <h2>Bạn cần gì cho bé?</h2>
          </div>
          <div className="home-next-entry__grid">
            <Link href="/dich-vu" className="home-next-entry__card home-next-reveal group">
              <img src="/images/spa-care-hero.jpg" alt="Chú chó được chải lông nhẹ nhàng" />
              <div><p>Dịch vụ</p><h3>Spa và cắt tỉa.</h3><span>Xem dịch vụ <ArrowUpRight className="size-4" aria-hidden="true" /></span></div>
            </Link>
            <Link href="/cua-hang" className="home-next-entry__card home-next-reveal group">
              <img src="/images/shop-essentials-hero.jpg" alt="Đồ dùng chăm sóc và thức ăn cho thú cưng" />
              <div><p>Cửa hàng</p><h3>Thức ăn và đồ dùng.</h3><span>Xem sản phẩm <ArrowUpRight className="size-4" aria-hidden="true" /></span></div>
            </Link>
          </div>
        </section>

        <section className="home-next-process" aria-labelledby="home-process-title">
          <div className="home-next-process__inner">
            <div className="home-next-process__intro home-next-reveal">
              <p className="home-next-eyebrow">Đặt lịch Spa</p>
              <h2 id="home-process-title">Buổi Spa diễn ra thế nào?</h2>
              <p>Bốn bước từ khi đặt lịch đến lúc đón bé.</p>
              <Link href="/dat-lich" className="customer-secondary-action">Chọn giờ hẹn <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
            <ol className="home-next-process__steps">
              {careSteps.map(([title, description], index) => (
                <li key={title} className="home-next-reveal">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="home-next-catalog" aria-labelledby="home-services-title">
          <div className="home-next-section-heading home-next-reveal">
            <div><p className="home-next-eyebrow">Dịch vụ</p><h2 id="home-services-title">Chọn dịch vụ cho bé.</h2></div>
            <Link href="/dich-vu">Xem tất cả dịch vụ <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          </div>
          {services.length > 0 ? (
            <div className="home-next-service-grid">
              {services.map((service) => {
                const prices = service.priceTiers?.map((tier) => Number(tier.price)) ?? [];
                const startingPrice = prices.length ? Math.min(...prices) : null;
                return (
                  <Link key={service.id} href={`/dich-vu/${service.slug}`} className="home-next-service home-next-reveal group">
                    <div className="home-next-service__image"><img src={service.imageUrl || "/images/spa-care-hero.jpg"} alt={service.name} onError={(event) => { event.currentTarget.src = "/images/spa-care-hero.jpg"; }} /></div>
                    <div><h3>{service.name}</h3><p>{startingPrice === null ? "Xem chi tiết dịch vụ" : `Giá tham khảo từ ${formatVND(startingPrice)}`}</p></div>
                    <ArrowUpRight className="size-5" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="home-next-catalog__empty home-next-reveal"><p>{servicesLoading ? "Đang tải dịch vụ..." : "Hiện chưa có dịch vụ để hiển thị."}</p><Link href="/dich-vu" className="customer-primary-action">Xem dịch vụ <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
          )}
        </section>

        <section className="home-next-catalog home-next-catalog--shop" aria-labelledby="home-shop-title">
          <div className="home-next-section-heading home-next-reveal">
            <div><p className="home-next-eyebrow">Cửa hàng</p><h2 id="home-shop-title">Sản phẩm cho bé.</h2></div>
            <Link href="/cua-hang">Xem cửa hàng <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          </div>
          {products.length > 0 ? (
            <div className="home-next-product-grid">
              {products.map((product) => (
                <Link key={product.id} href={getProductDetailHref(product.slug)} className="home-next-product home-next-reveal group">
                  <div><img src={product.imageUrl || "/product-placeholder.svg"} alt={product.name} onError={(event) => { event.currentTarget.src = "/product-placeholder.svg"; }} /></div>
                  <h3>{product.name}</h3><p>{formatVND(product.price)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="home-next-catalog__empty home-next-reveal"><p>{productsLoading ? "Đang tải sản phẩm..." : "Hiện chưa có sản phẩm để hiển thị."}</p><Link href="/cua-hang" className="customer-primary-action">Xem cửa hàng <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
          )}
        </section>

        {review && (
          <section className="home-next-review home-next-reveal" aria-labelledby="home-review-title">
            <div><p className="home-next-eyebrow">Đánh giá</p><h2 id="home-review-title">Khách hàng nói gì?</h2></div>
            <blockquote><p>“{review.comment}”</p><footer>Đánh giá dành cho {review.targetName || (review.targetType === "SERVICE" ? "dịch vụ" : "sản phẩm")}</footer></blockquote>
          </section>
        )}

        <section className="home-next-faq" aria-labelledby="home-faq-title">
          <div className="home-next-faq__heading home-next-reveal"><p className="home-next-eyebrow">Câu hỏi thường gặp</p><h2 id="home-faq-title">Bạn cần biết gì trước khi đặt lịch?</h2><Link href="/cau-hoi-thuong-gap">Xem tất cả câu hỏi <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
          <div className="home-next-faq__list home-next-reveal">
            {commonQuestions.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<Plus className="size-5" aria-hidden="true" /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </CustomerSiteFrame>
  );
}
