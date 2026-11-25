import { afterEach, describe, expect, it } from "bun:test";
import {
  invalidateAuthSession,
  registerAuthSessionInvalidationHandler,
} from "./auth-session";

describe("invalid auth session cleanup", () => {
  const globals = globalThis as typeof globalThis & {
    window?: unknown;
    document?: unknown;
    localStorage?: unknown;
  };
  const originalWindow = globals.window;
  const originalDocument = globals.document;
  const originalLocalStorage = globals.localStorage;

  afterEach(() => {
    if (originalWindow === undefined) delete globals.window;
    else Object.defineProperty(globals, "window", { configurable: true, value: originalWindow });
    if (originalDocument === undefined) delete globals.document;
    else Object.defineProperty(globals, "document", { configurable: true, value: originalDocument });
    if (originalLocalStorage === undefined) delete globals.localStorage;
    else Object.defineProperty(globals, "localStorage", { configurable: true, value: originalLocalStorage });
  });

  it("clears every persisted credential and notifies the in-memory auth store", () => {
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
      value: { removeItem: (key: string) => values.delete(key) },
    });
    Object.defineProperty(globals, "document", {
      configurable: true,
      value: {
        set cookie(value: string) {
          cookieWrites.push(value);
        },
      },
    });
    const unregister = registerAuthSessionInvalidationHandler(() => {
      invalidationCount += 1;
    });

    try {
      invalidateAuthSession();

      expect(values.size).toBe(0);
      expect(cookieWrites).toHaveLength(2);
      expect(cookieWrites.every((value) => value.includes("expires=Thu, 01 Jan 1970"))).toBe(true);
      expect(invalidationCount).toBe(1);
    } finally {
      unregister();
    }
  });
});
