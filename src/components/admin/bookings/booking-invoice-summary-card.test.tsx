import { describe, expect, it } from "bun:test";
import { getInvoicePromotionDiscount } from "./booking-invoice-summary-card";
import { getBookingAmountDue } from "@/lib/booking-payment-presentation";

describe("booking invoice promotion discount", () => {
  it("does not display a voucher again as a generic invoice discount after payment", () => {
    expect(getInvoicePromotionDiscount(48_000, 48_000, true)).toBe(0);
  });

  it("keeps any separate invoice discount visible after removing the voucher portion", () => {
    expect(getInvoicePromotionDiscount(68_000, 48_000, true)).toBe(20_000);
  });

  it("keeps the saved invoice discount unchanged before payment", () => {
    expect(getInvoicePromotionDiscount(20_000, 48_000, false)).toBe(20_000);
  });
});

describe("booking invoice amount due after cancellation", () => {
  it("shows no receivable for a cancelled unpaid booking", () => {
    expect(getBookingAmountDue("CANCELLED", "CANCELLED", false, 350_000)).toBe(0);
  });

  it("keeps the unpaid balance for active bookings and clears paid balances", () => {
    expect(getBookingAmountDue("READY_FOR_PICKUP", "READY_FOR_PICKUP", false, 350_000)).toBe(350_000);
    expect(getBookingAmountDue("COMPLETED", "DONE", true, 350_000)).toBe(0);
  });
});
