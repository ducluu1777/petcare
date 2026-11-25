import { removeClientCookie } from "./cookies";

type AuthSessionInvalidationHandler = () => void;

const invalidationHandlers = new Set<AuthSessionInvalidationHandler>();

export function registerAuthSessionInvalidationHandler(
  handler: AuthSessionInvalidationHandler,
) {
  invalidationHandlers.add(handler);
  return () => invalidationHandlers.delete(handler);
}

export function invalidateAuthSession() {
  if (typeof window === "undefined") return;

  for (const key of [
    "petcare_token",
    "petcare_refresh_token",
    "petcare_user",
    "petcare_auth_storage",
  ]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Still clear the other browser session stores if one storage operation fails.
    }
  }

  removeClientCookie("petcare_token");
  removeClientCookie("petcare_role");

  for (const handler of invalidationHandlers) {
    handler();
  }
}
