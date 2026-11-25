import { describe, expect, it } from "vitest";
import { getOrderPaymentState } from "./order-payment-state";

describe("getOrderPaymentState", () => {
  const now = new Date("2026-10-23T10:00:00.000Z").getTime();

  it("prioritizes confirmed payment over an expired deadline", () => {
    expect(getOrderPaymentState({ isPaid: true, status: "PENDING", paymentExpiresAt: "2026-10-23T09:00:00.000Z" }, now)).toBe("PAID");
  });

  it("hides payment for cancelled and expired unpaid orders", () => {
    expect(getOrderPaymentState({ isPaid: false, status: "CANCELLED" }, now)).toBe("CANCELLED");
    expect(getOrderPaymentState({ isPaid: false, status: "PENDING", paymentExpiresAt: "2026-10-23T09:00:00.000Z" }, now)).toBe("EXPIRED");
  });

  it("keeps the QR available while an unpaid order is within its deadline", () => {
    expect(getOrderPaymentState({ isPaid: false, status: "PENDING", paymentExpiresAt: "2026-10-23T11:00:00.000Z" }, now)).toBe("WAITING");
  });
});
