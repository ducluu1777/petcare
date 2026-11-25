import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { clearIdempotencyKey, getIdempotencyKey } from "./idempotency-key";

const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
let values: Map<string, string>;

beforeEach(() => {
  values = new Map();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
});

afterEach(() => {
  if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
  else delete (globalThis as any).window;
  if (storageDescriptor) Object.defineProperty(globalThis, "sessionStorage", storageDescriptor);
  else delete (globalThis as any).sessionStorage;
});

describe("client idempotency keys", () => {
  it("reuses a key for a retry with the same payload, regardless of object key order", () => {
    const first = getIdempotencyKey("online-order", { items: [{ productId: "p1", quantity: 2 }], voucherCode: "SAVE" });
    const retry = getIdempotencyKey("online-order", { voucherCode: "SAVE", items: [{ quantity: 2, productId: "p1" }] });

    expect(retry).toBe(first);
  });

  it("keeps operation scopes separate and rotates the key when the payload changes", () => {
    const orderKey = getIdempotencyKey("online-order", { items: [{ productId: "p1", quantity: 1 }] });
    const changedOrderKey = getIdempotencyKey("online-order", { items: [{ productId: "p1", quantity: 2 }] });
    const counterSaleKey = getIdempotencyKey("counter-sale", { items: [{ productId: "p1", quantity: 1 }] });

    expect(changedOrderKey).not.toBe(orderKey);
    expect(counterSaleKey).not.toBe(orderKey);
  });

  it("keeps retry keys for multiple payloads in the same scope", () => {
    const originalPayload = { items: [{ productId: "p1", quantity: 1 }] };
    const otherPayload = { items: [{ productId: "p2", quantity: 1 }] };
    const originalKey = getIdempotencyKey("online-order", originalPayload);

    getIdempotencyKey("online-order", otherPayload);

    expect(getIdempotencyKey("online-order", originalPayload)).toBe(originalKey);
  });

  it("clears only the successful payload and retains other pending retries", () => {
    const firstPayload = { items: [{ productId: "p1", quantity: 1 }] };
    const secondPayload = { items: [{ productId: "p2", quantity: 1 }] };
    const firstKey = getIdempotencyKey("online-order", firstPayload);
    const secondKey = getIdempotencyKey("online-order", secondPayload);

    clearIdempotencyKey("online-order", secondPayload);

    expect(getIdempotencyKey("online-order", firstPayload)).toBe(firstKey);
    expect(getIdempotencyKey("online-order", secondPayload)).not.toBe(secondKey);
  });

  it("clears only the successful payload key so a later deliberate submit is new", () => {
    const payload = { petId: "pet-1", startAt: "2026-10-30T10:00:00+07:00" };
    const first = getIdempotencyKey("booking-v2", payload);

    clearIdempotencyKey("booking-v2", { ...payload, startAt: "2026-10-30T10:30:00+07:00" });
    expect(getIdempotencyKey("booking-v2", payload)).toBe(first);

    clearIdempotencyKey("booking-v2", payload);
    expect(getIdempotencyKey("booking-v2", payload)).not.toBe(first);
  });
});
