import { describe, expect, it } from "bun:test";
import { getContactRequestAttentionCard, summarizeBookings, summarizeTransactions } from "./dashboard-metrics";

describe("admin dashboard metrics", () => {
  it("labels open contact requests as needing a response, including requests already in progress", () => {
    expect(getContactRequestAttentionCard({ openCount: 1, isLoading: false, isError: false })).toEqual({
      label: "Yêu cầu liên hệ cần phản hồi",
      value: 1,
      attention: true,
    });
  });

  it("does not raise a contact-request alert for an empty or unavailable queue", () => {
    expect(getContactRequestAttentionCard({ openCount: 0, isLoading: false, isError: false })).toEqual({
      label: "Yêu cầu liên hệ cần phản hồi",
      value: 0,
      attention: false,
    });
    expect(getContactRequestAttentionCard({ openCount: 3, isLoading: true, isError: false }).value).toBe("…");
    expect(getContactRequestAttentionCard({ openCount: 3, isLoading: false, isError: true }).value).toBe("—");
  });

  it("counts bookings by their actual statuses", () => {
    expect(summarizeBookings([
      { status: "PENDING" },
      { status: "IN_PROGRESS" },
      { status: "COMPLETED" },
      { status: "CANCELLED" },
    ])).toEqual({ total: 4, active: 2, completed: 1 });
  });

  it("does not invent revenue or payment-method splits when there are no transactions", () => {
    expect(summarizeTransactions([], new Date(2026, 9, 16))).toEqual({
      revenue: 0,
      cash: 0,
      bankTransfer: 0,
      transactionCount: 0,
    });
  });

  it("uses only today's real payments and subtracts refunds", () => {
    expect(summarizeTransactions([
      { amount: 100, type: "FINAL_PAYMENT", paymentMethod: "CASH", createdAt: "2026-10-16T01:00:00.000Z" },
      { amount: 40, type: "FINAL_PAYMENT", paymentMethod: "BANK_TRANSFER", createdAt: "2026-10-16T02:00:00.000Z" },
      { amount: 10, type: "REFUND", paymentMethod: "CASH", createdAt: "2026-10-16T03:00:00.000Z" },
      { amount: 999, type: "FINAL_PAYMENT", paymentMethod: "CASH", createdAt: "2026-10-15T03:00:00.000Z" },
    ], new Date(2026, 9, 16))).toEqual({
      revenue: 130,
      cash: 90,
      bankTransfer: 40,
      transactionCount: 3,
    });
  });

  it("uses the PetCare Vietnam day boundary when the browser is in another timezone", () => {
    expect(summarizeTransactions([
      { amount: 100, type: "FINAL_PAYMENT", paymentMethod: "CASH", createdAt: "2026-10-15T17:05:00.000Z" },
      { amount: 70, type: "FINAL_PAYMENT", paymentMethod: "CASH", createdAt: "2026-10-16T17:05:00.000Z" },
    ], new Date("2026-10-16T04:00:00.000Z"))).toMatchObject({ revenue: 100, transactionCount: 1 });
  });
});
