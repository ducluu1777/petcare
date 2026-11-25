import { describe, expect, it } from "bun:test";
import {
  buildPetCareStartAt,
  canCustomerSelfServeBooking,
} from "./booking-reschedule";

describe("customer booking reschedule helpers", () => {
  it("allows self service at the exact four hour cutoff", () => {
    const now = Date.parse("2026-10-20T00:00:00.000Z");
    const startAt = new Date(now + 4 * 60 * 60 * 1000).toISOString();

    expect(canCustomerSelfServeBooking(startAt, now)).toBe(true);
  });

  it("requires support once the booking is inside the four hour window", () => {
    const now = Date.parse("2026-10-20T00:00:00.000Z");
    const startAt = new Date(now + 4 * 60 * 60 * 1000 - 1).toISOString();

    expect(canCustomerSelfServeBooking(startAt, now)).toBe(false);
    expect(canCustomerSelfServeBooking(null, now)).toBe(false);
  });

  it("converts a selected Vietnam date and slot to the backend ISO timestamp", () => {
    expect(buildPetCareStartAt("2026-10-21", "10:30")).toBe("2026-10-21T03:30:00.000Z");
  });
});
