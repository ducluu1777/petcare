import { describe, expect, it } from "bun:test";
import { getBookingAmountDue, getBookingPaymentMessage } from "./booking-payment-presentation";

describe("booking payment presentation", () => {
  it("does not show a payment due or counter payment instruction after cancellation", () => {
    expect(getBookingAmountDue("CANCELLED", undefined, false, 350_000)).toBe(0);
    expect(getBookingPaymentMessage("CANCELLED", undefined, false)).toBe("Lịch đã hủy.");
  });

  it("preserves payment information for active and paid bookings", () => {
    expect(getBookingAmountDue("READY_FOR_PICKUP", undefined, false, 350_000)).toBe(350_000);
    expect(getBookingAmountDue("DONE", undefined, true, 350_000)).toBe(0);
    expect(getBookingPaymentMessage("READY_FOR_PICKUP", undefined, false)).toBe("Thanh toán tại quầy khi đón bé.");
    expect(getBookingPaymentMessage("DONE", undefined, true)).toBe("Đã thanh toán hoàn tất");
  });

  it("recognizes cancellation from V2 even while the legacy status differs", () => {
    expect(getBookingAmountDue("CONFIRMED", "CANCELLED", false, 220_000)).toBe(0);
    expect(getBookingPaymentMessage("CONFIRMED", "CANCELLED", false)).toBe("Lịch đã hủy.");
  });
});
