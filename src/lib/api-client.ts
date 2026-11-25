import { setClientCookie, getClientCookie } from "@/lib/cookies";
import { invalidateAuthSession } from "@/lib/auth-session";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

function isProtectedEndpoint(endpoint: string): boolean {
  const path = endpoint.split("?")[0];
  if (path === "/time-slots/available") return false;
  if (path === "/bookings/available-slots") return false;
  if (path.startsWith("/users")) return true;
  if (path.startsWith("/pets")) return true;
  if (path.startsWith("/bookings")) return true;
  if (path.startsWith("/transactions")) return true;
  if (path.startsWith("/time-slots/admin") || path.startsWith("/time-slots/bulk") || /^\/time-slots\/[^/]+$/.test(path)) return true;
  if (path.startsWith("/notifications")) return true;
  if (path.startsWith("/contact-requests/admin")) return true;
  if (path.startsWith("/loyalty")) return true;
  if (path.startsWith("/orders")) return true;
  if (path.startsWith("/upload")) return true;
  if (path.startsWith("/vouchers/me")) return true;
  if (path.startsWith("/reviews/me")) return true;
  if (path.startsWith("/ai/admin")) return true;
  return false;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestBody = object | string | number | boolean | null;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (!Array.isArray(value)) return undefined;
  const messages = value.filter((item): item is string => typeof item === 'string')
    .map((message) => message.trim()).filter(Boolean);
  return messages.length ? messages.join('\n') : undefined;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers: customHeaders, ...fetchOptions } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };
  if (fetchOptions.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("petcare_token") || getClientCookie("petcare_token");
    if (token) {
      if (!localStorage.getItem("petcare_token")) {
        try { localStorage.setItem("petcare_token", token); } catch {}
      }
      if (!headers["Authorization"]) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  }

  // Pre-flight Guard: Block private endpoint fetches if not authenticated
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (isProtectedEndpoint(normalizedEndpoint) && !token) {
    throw new ApiError(401, "Yêu cầu đăng nhập để truy cập tài nguyên này", "UNAUTHORIZED");
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        0,
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.",
        "NETWORK_ERROR",
      );
    }
    throw error;
  }

  // Handle 401 Unauthorized by attempting a token refresh if refresh token exists
  if (res.status === 401 && !endpoint.includes("/auth/") && typeof window !== "undefined") {
    const refreshToken = localStorage.getItem("petcare_refresh_token");
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const tokens = refreshData?.data || refreshData;
          if (tokens?.accessToken) {
            localStorage.setItem("petcare_token", tokens.accessToken);
            setClientCookie("petcare_token", tokens.accessToken);
            if (tokens.refreshToken) {
              localStorage.setItem("petcare_refresh_token", tokens.refreshToken);
            }

            // Retry original request with newly refreshed token
            headers["Authorization"] = `Bearer ${tokens.accessToken}`;
            res = await fetch(url, {
              ...fetchOptions,
              headers,
            });
          }
        }
      } catch {
        // The original request remains unauthorized; clear the session below.
      }
    }

    if (res.status === 401) {
      invalidateAuthSession();
    }
  }

  const contentType = res.headers.get("content-type");
  let data: unknown = null;
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  }

  if (!res.ok) {
    const envelope = asRecord(data);
    const apiError = asRecord(envelope?.error);
    const errorMsg = readErrorMessage(apiError?.message)
      ?? readErrorMessage(envelope?.message)
      ?? `Yêu cầu thất bại với mã lỗi HTTP ${res.status}`;
    const rawErrorCode = apiError?.code ?? envelope?.statusCode;
    const errorCode = typeof rawErrorCode === "string"
      ? rawErrorCode
      : rawErrorCode === undefined
        ? "API_ERROR"
        : String(rawErrorCode);
    throw new ApiError(res.status, errorMsg, errorCode, data);
  }

  // Backend wraps responses in { success: true, data: ..., meta: ... }
  const envelope = asRecord(data);
  if (envelope && "data" in envelope) {
    // If it has pagination metadata, attach it
    if ("meta" in envelope) {
      return { data: envelope.data, meta: envelope.meta } as T;
    }
    return envelope.data as T;
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: "GET", ...options }),
  post: <T>(endpoint: string, body?: RequestBody, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: <T>(endpoint: string, body?: RequestBody, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T>(endpoint: string, body?: RequestBody, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: "DELETE", ...options }),
};
