"use client";

import * as React from "react";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  X, 
  LogIn, 
  AlertCircle, 
  Mail, 
  ShieldCheck,
  ArrowRight
} from "lucide-react";

interface QuickAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEmail?: string;
  initialPhone?: string;
  initialName?: string;
  purpose?: 'booking' | 'shopping';
}

export function QuickAuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = "",
  purpose = 'booking',
}: QuickAuthModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sendEmailOtp, loginWithEmailOtp } = useAuthStore();

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    setLoading(true);
    try {
      await sendEmailOtp(email);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể gửi mã xác nhận. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp.trim()) {
      setError("Vui lòng nhập mã xác nhận.");
      return;
    }
    setLoading(true);
    try {
      await loginWithEmailOtp(email, otp);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Mã xác nhận không đúng hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EAECEB] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-[#E8F4F5]/60 to-white border-b border-[#EAECEB]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1D7980]/10 text-[#1D7980] text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {purpose === 'shopping' ? 'Mua hàng tại PetCare' : 'Xác thực đặt lịch'}
            </span>
          </div>
          <h2 className="text-xl font-black text-[#1A1F1E] font-[family-name:var(--font-display)]">
            Đăng nhập để tiếp tục
          </h2>
          <p className="text-xs text-[#66706E] mt-1">
            {purpose === 'shopping' ? 'Đăng nhập để thêm sản phẩm vào giỏ và theo dõi đơn hàng của bạn.' : 'Đăng nhập để chọn hồ sơ của bé và theo dõi lịch hẹn trong tài khoản.'}
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1F1E] mb-1.5">
                  Email của bạn
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="vidu@petcare.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#EAECEB] text-xs focus:outline-none focus:ring-2 focus:ring-[#1D7980] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 rounded-xl bg-[#1D7980] hover:bg-[#155e63] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Nhận mã OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="text-xs text-slate-500 mb-1">Mã xác nhận đã được gửi đến:</div>
                <div className="font-bold text-[#1A1F1E]">{email}</div>
                <button 
                  type="button" 
                  onClick={() => setStep("email")}
                  className="text-[10px] text-primary font-bold mt-1 hover:underline cursor-pointer"
                >
                  Đổi email khác
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1F1E] mb-1.5 text-center">
                  Nhập mã 6 chữ số
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-[#EAECEB] text-xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1D7980] focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-xl bg-[#1D7980] hover:bg-[#155e63] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Xác nhận và tiếp tục</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="px-6 py-3 bg-[#FAFAF7] border-t border-[#EAECEB] text-center">
          <p className="text-[11px] text-[#66706E]">
            Mã xác nhận chỉ dùng để đăng nhập. Không chia sẻ mã này cho người khác.
          </p>
        </div>
      </div>
    </div>
  );
}
