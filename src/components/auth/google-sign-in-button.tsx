"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";

interface GoogleSignInButtonProps {
  redirect?: string | null;
  mode?: "login" | "register";
}

const DEFAULT_GOOGLE_CLIENT_ID =
  "47764282701-7vv7jq1itb8a6hbf3mi82lhh7npfoii5.apps.googleusercontent.com";

export function GoogleSignInButton({ redirect, mode = "login" }: GoogleSignInButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = redirect || searchParams.get("redirect");

  const { googleLogin, isLoading: authLoading } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  // Tải script Google Identity Services
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleGoogleSuccess = async (googlePayload: {
    idToken: string;
    providerAccountId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) => {
    try {
      const loggedUser = await googleLogin(googlePayload);

      // Google OAuth users initially have no phone number in DB (first-time login)
      const isFirstTime = !loggedUser.phone;
      let target = "/tai-khoan";

      if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
        if (redirectParam.startsWith("/admin") && loggedUser.role === "CUSTOMER") {
          target = isFirstTime ? "/tai-khoan?walkthrough=1" : "/tai-khoan";
        } else {
          target = isFirstTime
            ? `/tai-khoan?walkthrough=1&redirect=${encodeURIComponent(redirectParam)}`
            : redirectParam;
        }
      } else if (loggedUser.role === "ADMIN" || loggedUser.role === "STAFF") {
        target = "/admin";
      } else {
        target = isFirstTime ? "/tai-khoan?walkthrough=1" : "/tai-khoan";
      }

      // Hard navigation to guarantee cookie sync with Next.js middleware and immediate page reload
      if (typeof window !== "undefined") {
        window.location.href = target;
      } else {
        router.replace(target);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Chưa thể đăng nhập bằng Google. Bạn thử lại sau ít phút.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = () => {
    setErrorMsg(null);

    if (!googleClientId) {
      setErrorMsg("Chưa cấu hình Google Client ID trong biến môi trường.");
      return;
    }

    const triggerOAuth = () => {
      setIsSubmitting(true);
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "email profile openid",
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setErrorMsg(
                `Lỗi Google OAuth: ${tokenResponse.error_description || tokenResponse.error}`
              );
              setIsSubmitting(false);
              return;
            }

            if (!tokenResponse?.access_token) {
              setIsSubmitting(false);
              return;
            }

            try {
              // Lấy thông tin tài khoản thật từ Google UserInfo API
              const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              });

              if (!res.ok) {
                throw new Error("Không thể lấy thông tin người dùng từ Google.");
              }

              const profile = await res.json();

              if (!profile?.email || !profile?.sub) {
                throw new Error("Tài khoản Google thiếu thông tin email hoặc định danh người dùng.");
              }

              await handleGoogleSuccess({
                idToken: tokenResponse.access_token,
                providerAccountId: profile.sub,
                email: profile.email,
                name: profile.name || profile.email.split("@")[0],
                avatarUrl: profile.picture,
              });
            } catch (fetchErr: any) {
              setErrorMsg(fetchErr.message || "Không thể kết nối lấy dữ liệu từ Google.");
              setIsSubmitting(false);
            }
          },
          error_callback: (err: any) => {
            setIsSubmitting(false);
            if (err?.type !== "popup_closed") {
              setErrorMsg("Cửa sổ đăng nhập Google đã bị đóng hoặc bị chặn.");
            }
          },
        });

        client.requestAccessToken({ prompt: "select_account" });
      } catch (e: any) {
        setIsSubmitting(false);
        setErrorMsg(e.message || "Không thể mở cửa sổ đăng nhập Google.");
      }
    };

    if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
      triggerOAuth();
    } else if (typeof window !== "undefined") {
      setIsSubmitting(true);
      let script = document.getElementById("google-gsi-script") as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = "google-gsi-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
      script.addEventListener(
        "load",
        () => {
          triggerOAuth();
        },
        { once: true }
      );
    }
  };

  return (
    <div className="w-full space-y-2">
      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold text-center leading-relaxed">
          {errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={isSubmitting || authLoading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full border border-[#E8E5DE] bg-white text-[#1A1F1E] text-xs font-bold hover:bg-[#F2F7F6] hover:border-[#1D7980]/30 transition-all shadow-2xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#1D7980]" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{mode === "register" ? "Đăng ký với Google" : "Tiếp tục với Google"}</span>
      </button>
    </div>
  );
}
