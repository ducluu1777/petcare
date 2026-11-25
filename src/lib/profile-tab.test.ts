import { describe, expect, it } from "vitest";
import { getProfileTabFromSearch } from "./profile-tab";

describe("getProfileTabFromSearch", () => {
  it("opens the requested points and voucher tab", () => {
    expect(getProfileTabFromSearch("?tab=points")).toBe("points");
  });

  it("keeps the default bookings tab for unrelated values", () => {
    expect(getProfileTabFromSearch("?tab=admin")).toBe("bookings");
    expect(getProfileTabFromSearch("")).toBe("bookings");
  });
});
