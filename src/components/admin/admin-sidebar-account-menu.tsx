"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, ExternalLink, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth-store";

export function AdminSidebarAccountMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const roleLabel = user?.role === "ADMIN" ? "Quản trị viên" : "Nhân viên";

  const handleLogout = async () => {
    await logout();
    router.push("/dang-nhap-admin");
  };

  return (
    <SidebarFooter className="border-t border-border-subtle bg-surface p-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton className="flex h-14 w-full items-center justify-between rounded-xl border border-border-subtle bg-surface p-2.5 transition-colors hover:bg-admin-muted-surface">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-10 w-9 items-center justify-center rounded-xl bg-admin-primary-light text-xs font-bold uppercase text-admin-primary-hover">
                        {user?.name ? user.name.charAt(0) : "A"}
                      </div>
                    </div>

                    <div className="flex flex-col truncate text-left">
                      <span className="truncate text-xs font-bold text-ink">
                        {user?.name || roleLabel}
                      </span>
                      <span className="truncate text-xs font-semibold text-admin-primary">
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                  <ChevronUp className="ml-1 size-4 shrink-0 text-muted-text" />
                </SidebarMenuButton>
              }
            />
            <DropdownMenuContent
              side="top"
              align="start"
              className="z-50 w-[--radix-popper-anchor-width] rounded-xl border border-border-subtle bg-surface p-1.5 text-xs animate-in fade-in zoom-in-95"
            >
              <div className="border-b border-admin-divider px-3 py-2">
                <p className="font-bold text-ink">{user?.name || roleLabel}</p>
                <p className="truncate text-xs text-muted-text">{user?.email || "Tài khoản PetCare"}</p>
              </div>

              <div className="py-1">
                <DropdownMenuItem
                  render={<Link href="/" />}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 font-medium text-ink hover:bg-canvas hover:text-admin-primary"
                >
                  <ExternalLink className="size-3.5 text-admin-primary" />
                  <span>Xem giao diện khách hàng</span>
                </DropdownMenuItem>

              </div>

              <DropdownMenuSeparator className="bg-admin-divider" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="size-3.5" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
