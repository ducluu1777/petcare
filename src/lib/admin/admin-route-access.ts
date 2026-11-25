export type AdminRouteRole = "STAFF" | "ADMIN" | "CUSTOMER" | null | undefined;

const ADMIN_ONLY_PATHS = [
  "/admin/services",
  "/admin/vouchers",
  "/admin/delivery-areas",
  "/admin/ai",
  "/admin/users",
] as const;

export function canAccessAdminPath(role: AdminRouteRole, pathname: string): boolean {
  if (role === "ADMIN") return true;
  if (role !== "STAFF") return false;

  return !ADMIN_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
