"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, ShoppingBag, X, LogOut, Shield, User } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { NotificationBell } from "./NotificationBell";

const navigation = [
  { label: "Trang chủ", href: "/" },
  { label: "Dịch vụ", href: "/dich-vu" },
  { label: "Cửa hàng", href: "/cua-hang" },
  { label: "Liên hệ", href: "/lien-he" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalCartItems = useCartStore((state) => state.getTotalItems());
  const { user, isAuthenticated, logout } = useAuthStore();
  const isStaff = user?.role === "ADMIN" || user?.role === "STAFF";
  const accountHref = isStaff ? "/admin/bookings" : "/tai-khoan";

  const closeMenu = () => setMobileMenuOpen(false);
  const signOut = async () => {
    await logout();
    closeMenu();
    router.replace("/");
  };

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="petcare-site-header customer-site-header">
      <div className="customer-site-header__utility">
        <div className="customer-site-header__utility-inner">
          <span className="customer-site-header__location"><strong>PetCare</strong><span className="customer-site-header__address"> <span aria-hidden="true">·</span> 38 Cầu Giấy, Quan Hoa, Hà Nội</span></span>
          <span className="customer-site-header__hours">Cửa hàng 08:30–20:30 <span aria-hidden="true">·</span> Nhận lịch Spa đến 18:30</span>
          <a href="tel:0941900966">Gọi 0941 900 966</a>
        </div>
      </div>

      <div className="customer-site-header__inner">
        <Link href="/" className="customer-site-brand" aria-label="PetCare, về trang chủ">
          <span className="customer-site-brand__mark"><img src="/logo.png" alt="" /></span>
          <span className="customer-site-brand__copy">
            <span className="customer-site-brand__name">petcare</span>
            <span className="customer-site-brand__tagline">Spa & chăm sóc thú cưng</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="customer-site-nav">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="customer-site-nav__link"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="customer-site-header__notification">
          <NotificationBell />
        </div>

        <div className="customer-site-header__actions">
          {isAuthenticated && user ? (
            <div className="customer-site-account">
              <Link href={accountHref} className="customer-site-account__link">
                {isStaff ? "Quản trị" : user.name?.split(" ").slice(-1)[0] || "Tài khoản"}
              </Link>
              <button type="button" onClick={signOut} aria-label="Đăng xuất" className="customer-site-icon-action">
                <LogOut aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Link href="/dang-nhap" className="customer-site-login">Đăng nhập</Link>
          )}
          <Link href="/gio-hang" aria-label={`Giỏ hàng${totalCartItems ? `, ${totalCartItems} sản phẩm` : ""}`} className="customer-site-cart">
            <ShoppingBag aria-hidden="true" />
            <span>Giỏ hàng</span>
            {totalCartItems > 0 && <span className="customer-site-cart__count">{totalCartItems}</span>}
          </Link>
          <Link href="/dat-lich" className="customer-site-cta">Đặt lịch Spa <ArrowUpRight aria-hidden="true" /></Link>
        </div>

        <div className="customer-site-header__mobile-actions">
          <Link href="/gio-hang" aria-label={`Giỏ hàng${totalCartItems ? `, ${totalCartItems} sản phẩm` : ""}`} className="customer-site-mobile-cart">
            <ShoppingBag aria-hidden="true" />
            {totalCartItems > 0 && <span>{totalCartItems}</span>}
          </Link>
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="customer-site-menu-toggle"
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="customer-site-mobile-menu">
          <nav aria-label="Điều hướng điện thoại" className="customer-site-mobile-menu__links">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} onClick={closeMenu} aria-current={isActive(item.href) ? "page" : undefined}>
                <span>{item.label}</span><ArrowUpRight aria-hidden="true" />
              </Link>
            ))}
          </nav>
          <div className="customer-site-mobile-menu__account">
            {isAuthenticated && user ? (
              <>
                <Link href={accountHref} onClick={closeMenu}>
                  {isStaff ? <Shield aria-hidden="true" /> : <User aria-hidden="true" />}
                  <span>{isStaff ? "Khu vực quản trị" : `Tài khoản${user.name ? ` · ${user.name}` : ""}`}</span>
                </Link>
                <button type="button" onClick={signOut}><LogOut aria-hidden="true" /> Đăng xuất</button>
              </>
            ) : (
              <Link href="/dang-nhap" onClick={closeMenu}><User aria-hidden="true" /> Đăng nhập hoặc tạo tài khoản</Link>
            )}
          </div>
          <Link href="/dat-lich" onClick={closeMenu} className="customer-site-mobile-cta">Đặt lịch Spa <ArrowUpRight aria-hidden="true" /></Link>
        </div>
      )}
    </header>
  );
}
