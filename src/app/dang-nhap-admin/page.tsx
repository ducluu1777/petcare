"use client";

import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { setClientCookie } from "@/lib/cookies";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/stores/auth-store";

type AdminLoginResponse = {
  user: AuthUser;
  tokens: { accessToken: string; refreshToken: string };
};

function safeAdminRedirect(value: string | null) {
  if (!value || !(value === "/admin" || value.startsWith("/admin/"))) {
    return "/admin";
  }
  return value;
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && (user?.role === "ADMIN" || user?.role === "STAFF")) {
      router.replace(safeAdminRedirect(searchParams.get("redirect")));
    }
  }, [isAuthenticated, user, router, searchParams]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const result = await apiClient.post<AdminLoginResponse>(
        "/auth/admin/password/login",
        { email: email.trim().toLowerCase(), password },
      );

      if (result.user.role !== "ADMIN" && result.user.role !== "STAFF") {
        throw new Error("Tài khoản này không có quyền truy cập khu vực quản trị.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("petcare_token", result.tokens.accessToken);
        localStorage.setItem("petcare_refresh_token", result.tokens.refreshToken);
        localStorage.setItem("petcare_user", JSON.stringify(result.user));
        setClientCookie("petcare_token", result.tokens.accessToken);
        setClientCookie("petcare_role", result.user.role);
        useAuthStore.setState({
          user: result.user,
          token: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        window.location.replace(safeAdminRedirect(searchParams.get("redirect")));
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
      );
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-[#F6F5F1] px-4 py-10 text-[#1A1F1E]">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-[#DCEAE2] opacity-70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#E9E4D8] opacity-70 blur-3xl" />

      <section className="relative w-full max-w-[430px] rounded-3xl border border-[#E4E3DC] bg-white p-7 shadow-[0_20px_70px_rgba(26,31,30,0.08)] sm:p-9">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E9F1EC] text-[#28624A]">
            <ShieldCheck aria-hidden="true" className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold tracking-[0.04em] text-[#527362]">PetCare · Quản trị</p>
          <h1 className="mt-2 font-[family-name:var(--font-petcare-display)] text-2xl font-bold tracking-tight sm:text-[28px]">
            Đăng nhập nội bộ
          </h1>
          <p className="mt-2 max-w-[300px] text-sm leading-6 text-[#66706E]">
            Dành cho Quản trị viên và Nhân viên. Khách hàng vui lòng dùng trang đăng nhập khách hàng.
          </p>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <label htmlFor="admin-login-email" className="text-sm font-semibold text-[#28332E]">
              Email tài khoản
            </label>
            <input
              id="admin-login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
              maxLength={254}
              className="h-12 w-full rounded-xl border border-[#D9DDD8] bg-white px-3.5 text-sm outline-none transition focus:border-[#28624A] focus:ring-4 focus:ring-[#28624A]/10"
              placeholder="ten@petcare.vn"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-login-password" className="text-sm font-semibold text-[#28332E]">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="admin-login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                maxLength={128}
                className="h-12 w-full rounded-xl border border-[#D9DDD8] bg-white px-3.5 pr-12 text-sm outline-none transition focus:border-[#28624A] focus:ring-4 focus:ring-[#28624A]/10"
                placeholder="Nhập mật khẩu"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[#66706E] outline-none hover:text-[#28624A] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#28624A]"
              >
                {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <p className="-mt-2 text-xs leading-5 text-[#66706E]">
            Quên mật khẩu? Hãy liên hệ chủ hệ thống để được cấp lại.
          </p>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#28624A] px-4 text-sm font-bold text-white transition hover:bg-[#1E4F3A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#28624A]/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {busy ? "Đang xác thực…" : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-7 border-t border-[#ECEDE8] pt-5 text-center">
          <a href="/dang-nhap" className="text-sm font-medium text-[#527362] underline-offset-4 hover:text-[#1E4F3A] hover:underline">
            Đăng nhập khách hàng
          </a>
        </div>
      </section>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh flex-1 items-center justify-center bg-[#F6F5F1] text-sm text-[#66706E]">Đang tải trang đăng nhập…</main>}>
      <AdminLoginForm />
    </Suspense>
  );
}
