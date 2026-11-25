"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomerSiteFrame } from "@/components/layout/customer-ui";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useUpdateProfile } from "@/hooks/use-users";
import { isValidVietnamesePhoneNumber } from "@/lib/customer-phone-registration-link";
import type { AuthUser } from "@/stores/auth-store";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const requestedPhone = searchParams.get("phone")?.trim() ?? "";
  const phoneToLink = isValidVietnamesePhoneNumber(requestedPhone) ? requestedPhone : "";
  const isPhoneRegistrationLink = searchParams.has("phone");

  const {
    user,
    isAuthenticated,
    isLoading,
    error: authError,
    sendEmailOtp,
    loginWithEmailOtp,
    clearError,
    setUser,
  } = useAuthStore();
  const { mutateAsync: updateProfileAsync } = useUpdateProfile();

  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [developmentOtpCode, setDevelopmentOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [localError, setLocalError] = useState("");
  const phoneLinkProcessed = useRef(false);
  const visibleError = localError || (
    isPhoneRegistrationLink && !phoneToLink
      ? "Link đăng ký không hợp lệ. Vui lòng yêu cầu nhân viên gửi lại."
      : authError
  );

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleRedirect = useCallback((loggedUser: AuthUser) => {
    const isFirstTime = !loggedUser.phone;
    let target = "/tai-khoan";

    if (
      redirectParam &&
      redirectParam.startsWith("/") &&
      !redirectParam.startsWith("//")
    ) {
      if (
        redirectParam.startsWith("/admin") &&
        loggedUser.role === "CUSTOMER"
      ) {
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

    if (typeof window !== "undefined") {
      window.location.href = target;
    } else {
      router.replace(target);
    }
  }, [redirectParam, router]);

  // A registration link associates its phone only after the customer signs in.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!isPhoneRegistrationLink) {
      handleRedirect(user);
      return;
    }
    if (user.role !== "CUSTOMER") {
      handleRedirect(user);
      return;
    }
    if (!phoneToLink) return;
    if (user.phone === phoneToLink) {
      if (!otpSent && !phoneLinkProcessed.current) {
        handleRedirect(user);
      }
      return;
    }
    if (otpSent || phoneLinkProcessed.current) return;

    phoneLinkProcessed.current = true;
    void updateProfileAsync({ phone: phoneToLink })
      .then((updatedUser) => {
        setUser(updatedUser);
        handleRedirect(updatedUser);
      })
      .catch((error: unknown) => {
        phoneLinkProcessed.current = false;
        setLocalError(error instanceof Error ? error.message : "Không thể liên kết số điện thoại. Vui lòng thử lại.");
      });
  }, [
    handleRedirect,
    isAuthenticated,
    isPhoneRegistrationLink,
    otpSent,
    phoneToLink,
    setUser,
    updateProfileAsync,
    user,
  ]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setLocalError(
        "Vui lòng nhập đúng định dạng email (ví dụ: khachhang@gmail.com).",
      );
      return;
    }

    try {
      const response = await sendEmailOtp(cleanEmail);
      setDevelopmentOtpCode(response.developmentOtpCode ?? "");
      setOtpSent(true);
      setOtpCountdown(60);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Không thể gửi mã OTP qua email. Vui lòng thử lại.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!otp.trim() || otp.trim().length < 6) {
      setLocalError("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    try {
      const loggedUser = await loginWithEmailOtp(
        otpEmail.trim().toLowerCase(),
        otp.trim(),
      );
      if (phoneToLink && loggedUser.phone !== phoneToLink) {
        const updatedUser = await updateProfileAsync({ phone: phoneToLink });
        setUser(updatedUser);
        handleRedirect(updatedUser);
      } else {
        handleRedirect(loggedUser);
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Mã OTP không chính xác hoặc đã hết hạn.");
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto px-4">
      {/* Main Clean Card (Major Brand Standard: Airbnb / Spotify / Nike style) */}
      <div className="bg-white rounded-3xl border border-[#DEDAD0] p-7 sm:p-9 shadow-[0_12px_40px_rgba(26,31,30,0.06)] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-[26px] font-extrabold text-[#253B33] tracking-tight">
            {isPhoneRegistrationLink ? "Hoàn tất đăng ký tài khoản" : "Mừng bạn quay lại"}
          </h1>

          <p className="text-xs text-[#65716A] leading-relaxed">
            {phoneToLink
              ? `Nhập email để nhận mã OTP. Sau khi xác thực email, số ${phoneToLink} sẽ được lưu vào tài khoản. Số điện thoại chưa được xác thực qua SMS.`
              : "Đăng nhập để xem lịch hẹn, hồ sơ thú cưng, đơn hàng và điểm tích lũy."}
          </p>
        </div>

        {/* Error Notification */}
        {visibleError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center leading-snug">
            {visibleError}
          </div>
        )}

        <div className="space-y-4">
          {/* 1-Tap Google Sign In */}
          {isPhoneRegistrationLink ? (
            <p className="rounded-xl border border-[#244B3F]/20 bg-[#F0EEE6] p-3 text-xs leading-relaxed text-[#1B3C33]">
              Dùng email để xác thực tài khoản và hoàn tất liên kết số điện thoại.
            </p>
          ) : (
            <GoogleSignInButton redirect={redirectParam} mode="login" />
          )}

          {/* Divider */}
          {!isPhoneRegistrationLink && <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#DEDAD0]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#65716A] text-[11px] font-medium">
                hoặc đăng nhập bằng email
              </span>
            </div>
          </div>}

          {/* Form */}
          <div className="space-y-3.5">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#253B33] mb-1">
                    Email của bạn
                  </label>
                  <input
                    type="email"
                    required
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="vidu@petcare.vn hoặc email@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF]/50 text-xs text-[#253B33] placeholder:text-[#65716A] focus:outline-hidden focus:border-[#244B3F] focus:bg-white focus:ring-2 focus:ring-[#244B3F]/15 transition-all"
                  />
                  <p className="text-[11px] text-[#65716A] mt-1">
                    Hệ thống sẽ gửi mã xác thực đến hộp thư email này.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !otpEmail.trim() || (isPhoneRegistrationLink && !phoneToLink)}
                  className="btn-tactile w-full py-3 rounded-full bg-[#244B3F] hover:bg-[#1B3C33] text-white font-bold text-xs shadow-md shadow-[#244B3F]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang gửi mã...</span>
                    </>
                  ) : (
                    <span>Tiếp tục</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div className="p-3 bg-[#F0EEE6] rounded-xl border border-[#244B3F]/20 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[#65716A]">Mã gửi đến: </span>
                    <strong className="text-[#244B3F] truncate inline-block max-w-[180px] align-bottom">
                      {otpEmail}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setDevelopmentOtpCode("");
                    }}
                    className="text-[#244B3F] hover:underline font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    Đổi email
                  </button>
                </div>

                {developmentOtpCode && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center"
                  >
                    <p className="text-[11px] font-medium text-amber-900">
                      Mã OTP cục bộ dành cho kiểm thử
                    </p>
                    <code className="mt-1 block text-lg font-bold tracking-[0.3em] text-amber-950">
                      {developmentOtpCode}
                    </code>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#253B33] mb-1">
                    Nhập mã xác thực
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF]/50 text-center tracking-[0.3em] font-mono text-base text-[#253B33] placeholder:text-[#65716A] focus:outline-hidden focus:border-[#244B3F] focus:bg-white focus:ring-2 focus:ring-[#244B3F]/15 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#65716A]">Chưa nhận được mã?</span>
                  {otpCountdown > 0 ? (
                    <span className="text-[#65716A]">
                      Gửi lại sau {otpCountdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[#244B3F] hover:underline font-semibold cursor-pointer"
                    >
                      Gửi lại mã xác thực
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="btn-tactile w-full py-3 rounded-full bg-[#244B3F] hover:bg-[#1B3C33] text-white font-bold text-xs shadow-md shadow-[#244B3F]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang xác nhận...</span>
                    </>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* Subtle Trust Indicators */}
    </div>
  );
}

export default function LoginPage() {
  return (
    <CustomerSiteFrame className="customer-site-frame--focused-flow">
      <main className="customer-auth-layout flex-1">
        <aside className="customer-auth-story">
          <img src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=84" alt="Nhân viên nhẹ nhàng chăm sóc một chú chó" />
          <div className="customer-auth-story__wash" aria-hidden="true" />
          <div className="customer-auth-story__copy">
            <p>PetCare</p>
            <h2>Một nơi thân quen cho những lần chăm sóc tiếp theo.</h2>
            <span>Xem lịch hẹn, lưu hồ sơ của bé và theo dõi đơn hàng ngay trong tài khoản.</span>
          </div>
        </aside>
        <div className="customer-auth-panel">
          <Suspense
            fallback={
              <div className="w-full max-w-[440px] rounded-[2rem] border border-[#DEDAD0] bg-[#FFFDF8] p-10 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#244B3F]" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </CustomerSiteFrame>
  );
}
