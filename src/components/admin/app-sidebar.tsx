"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  CalendarDays, 
  CalendarRange,
  Users, 
  Dog, 
  Scissors, 
  CreditCard, 
  ShoppingBag,
  Package,
  MapPin,
  Ticket,
  Star,
  Bot,
  MessageSquareText,
} from "lucide-react";
import { AdminSidebarAccountMenu } from "@/components/admin/admin-sidebar-account-menu";
import { useAuthStore } from "@/stores/auth-store";
import { canAccessAdminPath } from "@/lib/admin/admin-route-access";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Vận hành Spa",
    items: [
      {
        title: "Tổng quan",
        url: "/admin",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        title: "Lịch hẹn & Điều phối",
        url: "/admin/bookings",
        icon: CalendarDays,
      },
      {
        title: "Lịch hoạt động",
        url: "/admin/time-slots",
        icon: CalendarRange,
      },
      {
        title: "Hồ sơ thú cưng",
        url: "/admin/pets",
        icon: Dog,
      },
      {
        title: "Bảng giá & dịch vụ",
        url: "/admin/services",
        icon: Scissors,
      },
    ],
  },
  {
    label: "Đơn hàng & kho",
    items: [
      {
        title: "Đơn hàng",
        url: "/admin/orders",
        icon: ShoppingBag,
      },
      {
        title: "Khu vực giao hàng",
        url: "/admin/delivery-areas",
        icon: MapPin,
      },
      {
        title: "Sản phẩm & tồn kho",
        url: "/admin/products",
        icon: Package,
      },
      {
        title: "Voucher & ưu đãi",
        url: "/admin/vouchers",
        icon: Ticket,
      },
    ],
  },
  {
    label: "Tài chính",
    items: [
      {
        title: "Giao dịch & doanh thu",
        url: "/admin/transactions",
        icon: CreditCard,
      },
    ],
  },
  {
    label: "Khách hàng",
    items: [
      {
        title: "Tài khoản",
        url: "/admin/users",
        icon: Users,
      },
      {
        title: "Đánh giá",
        url: "/admin/reviews",
        icon: Star,
      },
      {
        title: "Yêu cầu liên hệ",
        url: "/admin/contact-requests",
        icon: MessageSquareText,
      },
    ],
  },
  {
    label: "Trợ lý AI",
    items: [
      {
        title: "Chatbot & kiến thức",
        url: "/admin/ai",
        icon: Bot,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const role = useAuthStore((state) => state.user?.role);

  return (
    <Sidebar className="z-30 border-r border-border-subtle bg-surface font-admin selection:bg-admin-primary selection:text-white">
      {/* 1. BRAND HEADER - CLEAN & UNIFIED TYPOGRAPHY */}
      <SidebarHeader className="flex h-20 items-center justify-center border-b border-border-subtle bg-surface px-5">
        <Link href="/admin" className="group flex w-full items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary focus-visible:ring-offset-2">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-surface p-1 transition-transform group-hover:scale-[1.03]">
              <Image
                src="/logo.png"
                alt="Logo PetCare"
                width={32}
                height={32}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-lg tracking-tight text-ink leading-none">
              PETCARE
            </span>
            <span className="text-xs font-semibold text-admin-primary tracking-tight mt-1 truncate">
              Hệ thống quản trị
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* 2. GROUPED NAVIGATION MENU - SPACIOUS & EASY TO READ */}
      <SidebarContent
        role="navigation"
        aria-label="Điều hướng quản trị"
        className="px-4 py-5 space-y-6 overflow-y-auto"
      >
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => canAccessAdminPath(role, item.url));
          if (visibleItems.length === 0) return null;

          return (
          <SidebarGroup key={section.label} className="p-0">
            <div className="px-3 pb-2 text-xs font-semibold tracking-tight text-admin-secondary">
              {section.label}
            </div>

            <SidebarMenu className="space-y-1.5">
            {visibleItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.url
                  : pathname?.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-current={isActive ? "page" : undefined} />}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                      tooltip={item.title}
                      isActive={isActive}
                      className={`w-full rounded-xl px-3.5 py-2.5 min-h-[44px] transition-all flex items-center justify-between group ${
                        isActive
                          ? "border border-admin-active-border bg-admin-primary-subtle font-semibold text-admin-primary-hover"
                          : "text-admin-secondary hover:bg-admin-muted-surface hover:text-ink"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                            isActive
                            ? "border-transparent bg-admin-primary text-white"
                              : "border-transparent bg-transparent text-admin-secondary-soft"
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                        </div>

                        <span className="truncate tracking-tight text-sm">{item.title}</span>
                      </div>

                      {isActive ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-admin-primary" /> : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
          );
        })}
      </SidebarContent>

      <AdminSidebarAccountMenu />
    </Sidebar>
  );
}
