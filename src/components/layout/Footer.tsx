import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin, Phone } from "lucide-react";

const footerLinks = [
  { label: "Dịch vụ và bảng giá", href: "/dich-vu" },
  { label: "Sản phẩm", href: "/cua-hang" },
  { label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" },
  { label: "Liên hệ", href: "/lien-he" },
];

export function Footer() {
  return (
    <footer className="customer-site-footer bg-[#135257] text-white">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14">
        <section className="customer-site-footer__cta" aria-labelledby="footer-booking-title">
          <div>
            <p className="mb-3 text-xs font-semibold text-[#F2C7B6]">Đặt lịch Spa</p>
            <h2 id="footer-booking-title">Đặt lịch cho bé.</h2>
            <p>Xem khung giờ còn chỗ và chọn dịch vụ trên website.</p>
          </div>
          <Link href="/dat-lich" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-[#F4F0E7] px-6 text-sm font-semibold text-[#135257] transition-colors hover:bg-white">
            Chọn giờ hẹn <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        <div className="customer-site-footer__main grid gap-10 pb-8 md:grid-cols-[1.2fr_0.8fr_1fr] md:gap-12">
          <div className="max-w-[390px]">
            <Link href="/" className="customer-site-footer__brand inline-flex items-center gap-3" aria-label="PetCare, về trang chủ">
              <img src="/logo.png" alt="" className="size-10 rounded-full object-cover" />
              <span className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.06em]">petcare</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-white/70">Spa, cắt tỉa và sản phẩm cho chó mèo.</p>
          </div>

          <nav aria-label="Liên kết cuối trang">
            <h2 className="text-xs font-semibold text-[#F2C7B6]">Tìm hiểu PetCare</h2>
            <ul className="mt-4 space-y-3">
              {footerLinks.map((link) => <li key={link.href}><Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">{link.label}</Link></li>)}
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold text-[#F2C7B6]">Ghé thăm cửa hàng</h2>
            <address className="mt-4 space-y-2 not-italic text-sm leading-6 text-white/70">
              <p className="font-medium text-white">PetCare</p>
              <p className="flex items-start gap-2"><MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />38 Cầu Giấy, Quan Hoa, Hà Nội</p>
              <p className="flex items-center gap-2"><Phone className="size-4 shrink-0" aria-hidden="true" /><a href="tel:0941900966" className="transition-colors hover:text-white">0941 900 966</a></p>
              <p className="flex items-center gap-2"><Clock3 className="size-4 shrink-0" aria-hidden="true" />Cửa hàng 08:30–20:30 · Spa 08:30–18:30</p>
            </address>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/15 py-5 text-xs leading-5 text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 PetCare Spa & Grooming</p>
          <p>Giá dịch vụ được xác nhận theo cân nặng thực tế trước khi làm.</p>
        </div>
      </div>
    </footer>
  );
}
