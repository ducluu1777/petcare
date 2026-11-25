import { describe, expect, it } from "bun:test";
import { replaceItemById, replacePagedItemById } from "./cancelled-query-cache";

describe("cancelled query cache helpers", () => {
  it("immediately replaces a booking in the customer's cached list", () => {
    const active = { id: "booking-1", status: "BOOKED", total: 250_000 };
    const unrelated = { id: "booking-2", status: "BOOKED", total: 180_000 };
    const cancelled = { ...active, status: "CANCELLED" };

    expect(replaceItemById([active, unrelated], cancelled)).toEqual([cancelled, unrelated]);
  });

  it("keeps an unrequested list undefined", () => {
    const cancelled = { id: "booking-1", status: "CANCELLED" };

    expect(replaceItemById(undefined, cancelled)).toBeUndefined();
  });

  it("immediately replaces a cancelled order without changing page metadata", () => {
    const active = { id: "order-1", status: "PENDING", total: 45_000 };
    const unrelated = { id: "order-2", status: "COMPLETED", total: 80_000 };
    const page = {
      data: [active, unrelated],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    };
    const cancelled = { ...active, status: "CANCELLED" };

    expect(replacePagedItemById(page, cancelled)).toEqual({
      data: [cancelled, unrelated],
      meta: page.meta,
    });
  });

  it("keeps an unrequested page undefined", () => {
    const cancelled = { id: "order-1", status: "CANCELLED" };

    expect(replacePagedItemById(undefined, cancelled)).toBeUndefined();
  });
});
