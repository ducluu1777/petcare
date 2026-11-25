import { describe, expect, it } from "bun:test";
import { canChangeManagedUserRole } from "./user-role-permissions";

describe("canChangeManagedUserRole", () => {
  it("does not let staff change any account role", () => {
    expect(canChangeManagedUserRole("STAFF", "CUSTOMER", "STAFF")).toBe(false);
    expect(canChangeManagedUserRole("STAFF", "CUSTOMER", "ADMIN")).toBe(false);
    expect(canChangeManagedUserRole("STAFF", "ADMIN", "STAFF")).toBe(false);
  });

  it("lets an admin manage admin roles", () => {
    expect(canChangeManagedUserRole("ADMIN", "CUSTOMER", "ADMIN")).toBe(true);
    expect(canChangeManagedUserRole("ADMIN", "ADMIN", "STAFF")).toBe(true);
  });
});
