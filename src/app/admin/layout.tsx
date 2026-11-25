"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { Search, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import { canAccessAdminPath } from "@/lib/admin/admin-route-access";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const canAccessCurrentRoute = canAccessAdminPath(user?.role, pathname ?? "");
  const [globalSearch, setGlobalSearch] = useState("");
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "anonymous">("checking");

  useEffect(() => {
    let cancelled = false;

    const verifyAdminSession = async () => {
      let verified = false;
      try {
        await useAuthStore.persist.rehydrate();
        if (cancelled) return;

        const auth = useAuthStore.getState();
        if (auth.token) {
          verified = !!(await auth.fetchProfile());
        } else if (auth.isAuthenticated || auth.user) {
          await auth.logout();
        }
      } catch {
        await useAuthStore.getState().logout().catch(() => {});
      } finally {
        if (!cancelled) setAuthStatus(verified ? "authenticated" : "anonymous");
      }
    };

    void verifyAdminSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const input = document.getElementById("admin-global-search") as HTMLInputElement;
        input?.focus();
        input?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (authStatus !== "checking") {
      if (authStatus === "anonymous" || !isAuthenticated) {
        router.replace(`/dang-nhap-admin?redirect=${encodeURIComponent(pathname)}`);
      } else if (user?.role !== "ADMIN" && user?.role !== "STAFF") {
        router.replace("/tai-khoan");
      } else if (!canAccessAdminPath(user.role, pathname ?? "")) {
        router.replace("/admin");
      }
    }
  }, [authStatus, isAuthenticated, user, router, pathname]);

  // Shield view while auth status is being evaluated or if unauthorized
  if (authStatus !== "authenticated" || isLoading || !isAuthenticated || (user?.role !== "ADMIN" && user?.role !== "STAFF")) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-admin-muted-surface p-6 text-ink">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-admin-primary" />
          <h3 className="font-bold text-sm">Đang kiểm tra quyền truy cập</h3>
          <p className="text-xs text-muted-text">
            PetCare đang xác thực tài khoản của bạn.
          </p>
        </div>
      </div>
    );
  }

  if (!canAccessCurrentRoute) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-admin-muted-surface p-6 text-ink">
        <div className="max-w-sm rounded-2xl border border-border-subtle bg-surface p-8 text-center">
          <h1 className="text-lg font-bold">Trang này chỉ dành cho quản trị viên</h1>
          <p className="mt-2 text-sm text-muted-text">Tài khoản nhân viên vẫn dùng được các màn lịch, đơn hàng, thu ngân và kho.</p>
          <Link href="/admin" className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-admin-primary px-4 text-sm font-semibold text-white">
            Về màn hình vận hành
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="admin-workspace font-admin antialiased">
      <a
        href="#admin-main"
        className="fixed left-3 top-3 z-[100] -translate-y-[calc(100%+1rem)] rounded-lg bg-surface px-4 py-3 text-sm font-semibold text-admin-primary-hover shadow-lg ring-2 ring-admin-primary transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-admin-primary/30"
      >
        Chuyển đến nội dung chính
      </a>
      <AppSidebar />
      <div className="flex h-dvh max-h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-admin-muted-surface text-ink font-admin">
        <header className="z-30 flex min-h-16 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-subtle bg-surface px-3 py-2 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
            <SidebarTrigger aria-label="Mở hoặc thu gọn điều hướng" className="rounded-lg p-2 text-admin-secondary transition-colors hover:bg-admin-primary-subtle hover:text-admin-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary" />
            <span className="hidden h-5 w-px bg-border-subtle sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">PetCare · Quản trị</p>
              <p className="hidden truncate text-xs text-muted-text sm:block">{user?.name || "Nhân viên"} · {user?.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}</p>
            </div>
          </div>
          <div className="relative order-2 w-full sm:order-none sm:ml-auto sm:max-w-lg sm:flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />
            <Input
              id="admin-global-search"
              type="search"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                const query = globalSearch.trim();
                router.push(query ? `/admin/bookings?q=${encodeURIComponent(query)}` : "/admin/bookings");
              }}
              placeholder="Mã lịch, tên/SĐT khách hoặc thú cưng"
              aria-label="Tìm lịch hẹn theo mã, tên hoặc số điện thoại khách hàng, tên hoặc giống thú cưng"
              className="h-10 w-full rounded-lg border-admin-border-quiet bg-admin-muted-surface py-2 pl-9 pr-14 text-sm transition-colors placeholder:text-admin-secondary-soft focus-visible:border-admin-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-admin-border-quiet bg-surface px-1.5 py-0.5 font-mono text-xs text-muted-text sm:inline">Ctrl/⌘ K</kbd>
          </div>
        </header>

        {/* Nội dung vùng làm việc quản trị (Admin Workspace) */}
        <main
          id="admin-main"
          tabIndex={-1}
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 focus-visible:outline-none"
        >
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
