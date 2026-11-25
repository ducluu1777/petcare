import { describe, expect, it } from "bun:test";
import { canAccessAdminPath } from "./admin-route-access";

describe("canAccessAdminPath", () => {
  it("keeps staff out of configuration and account management screens", () => {
    for (const path of [
      "/admin/services",
      "/admin/vouchers",
      "/admin/delivery-areas",
      "/admin/ai",
      "/admin/users",
    ]) {
      expect(canAccessAdminPath("STAFF", path)).toBe(false);
    }
  });

  it("allows staff to use day-to-day operations and read the schedule", () => {
    for (const path of [
      "/admin",
      "/admin/bookings",
      "/admin/time-slots",
      "/admin/pets",
      "/admin/products",
      "/admin/orders",
      "/admin/transactions",
      "/admin/contact-requests",
    ]) {
      expect(canAccessAdminPath("STAFF", path)).toBe(true);
    }
  });

  it("allows admins to open every admin screen", () => {
    expect(canAccessAdminPath("ADMIN", "/admin/ai")).toBe(true);
    expect(canAccessAdminPath("ADMIN", "/admin/users")).toBe(true);
  });

  it("matches route segments instead of similar prefixes", () => {
    expect(canAccessAdminPath("STAFF", "/admin/services-help")).toBe(true);
  });
});
