import { afterEach, describe, expect, it } from "bun:test";
import { apiClient } from "./api-client";
import { registerAuthSessionInvalidationHandler } from "./auth-session";

describe("apiClient expired-session handling", () => {
  const globals = globalThis as typeof globalThis & {
    window?: unknown;
    document?: unknown;
    localStorage?: unknown;
  };
  const originalWindow = globals.window;
  const originalDocument = globals.document;
  const originalLocalStorage = globals.localStorage;
  const originalFetch = globalThis.fetch;
  let unregister: (() => void) | undefined;

  afterEach(() => {
    unregister?.();
    unregister = undefined;
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globals.window;
    else Object.defineProperty(globals, "window", { configurable: true, value: originalWindow });
    if (originalDocument === undefined) delete globals.document;
    else Object.defineProperty(globals, "document", { configurable: true, value: originalDocument });
    if (originalLocalStorage === undefined) delete globals.localStorage;
    else Object.defineProperty(globals, "localStorage", { configurable: true, value: originalLocalStorage });
  });

  it("clears persisted and live auth when token refresh is rejected", async () => {
    const values = new Map<string, string>([
      ["petcare_token", "expired-access-token"],
      ["petcare_refresh_token", "expired-refresh-token"],
      ["petcare_user", "cached-user"],
      ["petcare_auth_storage", "cached-auth-state"],
    ]);
    const cookieWrites: string[] = [];
    let invalidationCount = 0;

    Object.defineProperty(globals, "window", { configurable: true, value: {} });
    Object.defineProperty(globals, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
      },
    });
    Object.defineProperty(globals, "document", {
      configurable: true,
      value: {
        cookie: "",
        set cookie(value: string) {
          cookieWrites.push(value);
        },
      },
    });
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        return new Response(JSON.stringify({ message: "refresh expired" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: { message: "access expired" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    unregister = registerAuthSessionInvalidationHandler(() => {
      invalidationCount += 1;
    });

    await expect(apiClient.get("/bookings")).rejects.toMatchObject({ status: 401 });

    expect(values.size).toBe(0);
    expect(cookieWrites).toHaveLength(2);
    expect(invalidationCount).toBe(1);
  });

  it("blocks unauthenticated AI administration requests before they reach the API", async () => {
    Object.defineProperty(globals, "window", { configurable: true, value: {} });
    Object.defineProperty(globals, "localStorage", {
      configurable: true,
      value: { getItem: () => null },
    });
    globalThis.fetch = (() => {
      throw new Error("Protected request reached the network");
    }) as typeof fetch;

    await expect(apiClient.get("/ai/admin/overview")).rejects.toMatchObject({ status: 401 });
  });
});
