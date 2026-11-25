"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { useAuthStore } from "@/stores/auth-store";
import { useCreatePet } from "@/hooks/use-pets";
import { useUpdateProfile } from "@/hooks/use-users";
import { normalizeOptionalPetName } from "./pet-form-utils";
import { getPostOnboardingRedirectTarget } from "@/lib/onboarding-redirect";
import {
  X,
  User,
  Phone,
  MapPin,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Gift,
  Calendar,
} from "lucide-react";

interface OnboardingWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  redirectUrl?: string | null;
}

export function OnboardingWalkthroughModal({
  isOpen,
  onClose,
  onComplete,
  redirectUrl,
}: OnboardingWalkthroughModalProps) {
  const router = useRouter();
  const { user, fetchProfile } = useAuthStore();
  const createPetMutation = useCreatePet();
  const updateProfileMutation = useUpdateProfile();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: User Profile info
  const [userNameOverride, setUserNameOverride] = useState<string | null>(null);
  const [userPhoneOverride, setUserPhoneOverride] = useState<string | null>(null);
  const userName = userNameOverride ?? user?.name ?? "";
  const userPhone = userPhoneOverride ?? user?.phone ?? "";
  const [userAddress, setUserAddress] = useState("");

  // Step 2: Pet Profile info
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<"DOG" | "CAT">("DOG");
  const [breed, setBreed] = useState("");
  const [weightKg, setWeightKg] = useState<string>("4.5");
  const [hasVaccine, setHasVaccine] = useState<boolean>(true);
  const [behavioralFlag, setBehavioralFlag] = useState<
    "NORMAL" | "TIMID" | "AGGRESSIVE"
  >("NORMAL");
  const [petNotes, setPetNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;

  const navigatePostOnboarding = () => {
    const target = getPostOnboardingRedirectTarget(redirectUrl);
    if (target && typeof window !== "undefined") {
      window.location.href = target;
    }
  };

  // STEP 1: VALIDATE & PERSIST
  const handleNextStep1 = async () => {
    setErrorMessage(null);
    if (!userName.trim()) {
      setErrorMessage("Vui lòng nhập họ và tên.");
      return;
    }

    const cleanPhone = userPhone.trim().replace(/\s+/g, "");
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      setErrorMessage(
        "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09).",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfileMutation.mutateAsync({
        name: userName.trim(),
        phone: cleanPhone,
      });
      await fetchProfile();
      setStep(2);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Số điện thoại này đã được sử dụng bởi tài khoản khác.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // SKIP STEP 2 (MANDATORY PHONE)
  const handleSkipFromStep1 = async () => {
    setErrorMessage(null);
    const cleanPhone = userPhone.trim().replace(/\s+/g, "");
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      setErrorMessage("Bắt buộc cần số điện thoại trước khi tiếp tục.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfileMutation.mutateAsync({
        name: userName.trim() || user?.name || "Khách hàng",
        phone: cleanPhone,
      });
      await fetchProfile();

      if (user?.id) {
        localStorage.setItem(`petcare_walkthrough_${user.id}`, "completed");
      }

      onClose();
      if (onComplete) onComplete();
      navigatePostOnboarding();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Số điện thoại này đã được sử dụng bởi tài khoản khác.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: SAVE PET
  const handleSavePetAndProfile = async () => {
    setErrorMessage(null);
    if (!weightKg || Number(weightKg) <= 0) {
      setErrorMessage("Vui lòng nhập cân nặng hợp lệ (kg).");
      return;
    }

    setIsSubmitting(true);

    try {
      await createPetMutation.mutateAsync({
        name: normalizeOptionalPetName(petName),
        species,
        breed:
          breed.trim() || (species === "DOG" ? "Poodle" : "Mèo Anh Lông Ngắn"),
        weightKg: Number(weightKg) || 4.5,
        hasVaccine,
        behavioralFlag,
        notes: petNotes.trim() || undefined,
      });

      if (user?.id) {
        localStorage.setItem(`petcare_walkthrough_${user.id}`, "completed");
      }

      setStep(3);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#1D7980", "#EE6952", "#2D6A4F", "#0284C7"],
        });
      } catch {}

      if (onComplete) onComplete();
      navigatePostOnboarding();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể lưu hồ sơ thú cưng. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // SKIP STEP 2
  const handleSkipFromStep2 = () => {
    if (user?.id) {
      localStorage.setItem(`petcare_walkthrough_${user.id}`, "completed");
    }
    onClose();
    if (onComplete) onComplete();
    navigatePostOnboarding();
  };

  // STEP 3: FINISH & BOOK
  const handleFinishAndBook = () => {
    if (user?.id) {
      localStorage.setItem(`petcare_walkthrough_${user.id}`, "completed");
    }
    onClose();
    const target = getPostOnboardingRedirectTarget(redirectUrl);
    if (target) {
      window.location.href = target;
    } else {
      router.push("/dat-lich");
    }
  };

  // CLOSE ATTEMPT (PHONE MANDATORY)
  const handleCloseAttempt = () => {
    const currentPhone =
      userPhone.trim().replace(/\s+/g, "") || user?.phone || "";
    if (!currentPhone || !phoneRegex.test(currentPhone)) {
      setErrorMessage("Bắt buộc cần số điện thoại trước khi đóng.");
      setStep(1);
      return;
    }

    if (!user?.phone && userPhone.trim()) {
      handleSkipFromStep1();
      return;
    }

    if (user?.id) {
      localStorage.setItem(`petcare_walkthrough_${user.id}`, "completed");
    }
    onClose();
    navigatePostOnboarding();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#EAECEB] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleCloseAttempt}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Header with Stepper */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-[#E8F4F5]/40 to-white border-b border-[#EAECEB]">
          <h2 className="text-lg font-bold text-[#1A1F1E] font-[family-name:var(--font-display)]">
            {step === 1 && "Thông tin tài khoản"}
            {step === 2 && "Thêm Chó / Mèo"}
            {step === 3 && "Hoàn tất"}
          </h2>
          <p className="text-xs text-[#66706E] mt-0.5">
            {step === 1 && "Vui lòng cập nhật số điện thoại để tiếp tục."}
            {step === 2 && "Bạn có thể thêm hồ sơ hoặc bỏ qua."}
            {step === 3 && "Đã lưu thông tin tài khoản."}
          </p>

          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  step >= 1
                    ? "bg-[#1D7980] text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                1
              </span>
              <span className="text-[11px] font-semibold text-[#1A1F1E]">
                Tài khoản
              </span>
            </div>
            <div
              className={`h-0.5 w-6 transition-colors ${
                step >= 2 ? "bg-[#1D7980]" : "bg-slate-200"
              }`}
            />
            <div className="flex-1 flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  step >= 2
                    ? "bg-[#1D7980] text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                2
              </span>
              <span className="text-[11px] font-semibold text-[#1A1F1E]">
                Thú cưng
              </span>
            </div>
            <div
              className={`h-0.5 w-6 transition-colors ${
                step >= 3 ? "bg-[#1D7980]" : "bg-slate-200"
              }`}
            />
            <div className="flex-1 flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  step === 3
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                3
              </span>
              <span className="text-[11px] font-semibold text-[#1A1F1E]">
                Xong
              </span>
            </div>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: OWNER INFO */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1F1E] mb-1.5">
                  Họ và tên *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Họ và tên của bạn"
                    value={userName}
                    onChange={(e) => setUserNameOverride(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#EAECEB] text-xs focus:outline-none focus:ring-2 focus:ring-[#1D7980]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1F1E] mb-1.5">
                  Số điện thoại *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="0987654321"
                    value={userPhone}
                    onChange={(e) => setUserPhoneOverride(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#EAECEB] text-xs focus:outline-none focus:ring-2 focus:ring-[#1D7980]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1F1E] mb-1.5">
                  Địa chỉ (Tùy chọn)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ví dụ: Cầu Giấy, Hà Nội"
                    value={userAddress}
                    onChange={(e) => setUserAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#EAECEB] text-xs focus:outline-none focus:ring-2 focus:ring-[#1D7980]"
                  />
                </div>
              </div>

              {/* STEP 1 ACTIONS */}
              <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSkipFromStep1}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Bỏ qua
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleNextStep1}
                  className="px-6 py-2.5 rounded-xl bg-[#1D7980] hover:bg-[#155e63] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Tiếp tục</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PET INFO */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1F1E] mb-2">
                  Loài *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSpecies("DOG")}
                    className={`py-2.5 px-4 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      species === "DOG"
                        ? "bg-[#E8F4F5] border-[#1D7980] text-[#1D7980]"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Chó
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpecies("CAT")}
                    className={`py-2.5 px-4 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      species === "CAT"
                        ? "bg-[#FDF0ED] border-[#EE6952] text-[#EE6952]"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Mèo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1A1F1E] mb-1">
                    Tên thú cưng
                  </label>
                  <input
                    type="text"
                    placeholder=""
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAECEB] text-xs focus:outline-none focus:ring-2 focus:ring-[#1D7980]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1F1E] mb-1">
                    Giống
                  </label>
                  <input
                    type="text"
                    placeholder={""}
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EAECEB] text-xs focus:outline-none focus:ring-2 focus:ring-[#1D7980]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1A1F1E] mb-1">
                    Cân nặng (kg) *
                  </label>
                  <div className="relative">
                    <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="80"
                      required
                      placeholder=""
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#EAECEB] text-xs focus:outline-none focus:ring-2 focus:ring-[#1D7980] tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1F1E] mb-1">
                    Tiêm phòng
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHasVaccine(true)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        hasVaccine
                          ? "bg-[#EDF5EB] border-[#2D6A4F] text-[#2D6A4F]"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Đã tiêm
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasVaccine(false)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        !hasVaccine
                          ? "bg-amber-50 border-amber-500 text-amber-800"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Chưa tiêm
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1F1E] mb-1.5">
                  Tính cách
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBehavioralFlag("NORMAL")}
                    className={`py-2 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                      behavioralFlag === "NORMAL"
                        ? "bg-[#EDF5EB] border-[#2D6A4F] text-[#2D6A4F] font-bold"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    Ngoan
                  </button>

                  <button
                    type="button"
                    onClick={() => setBehavioralFlag("TIMID")}
                    className={`py-2 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                      behavioralFlag === "TIMID"
                        ? "bg-amber-50 border-amber-500 text-amber-800 font-bold"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    Nhát sấy
                  </button>

                  <button
                    type="button"
                    onClick={() => setBehavioralFlag("AGGRESSIVE")}
                    className={`py-2 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                      behavioralFlag === "AGGRESSIVE"
                        ? "bg-rose-50 border-rose-500 text-rose-800 font-bold"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    Cần giữ nhẹ
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1F1E] mb-1">
                  Ghi chú (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Lưu ý thêm nếu có..."
                  value={petNotes}
                  onChange={(e) => setPetNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAECEB] text-xs focus:outline-none focus:ring-2 focus:ring-[#1D7980]"
                />
              </div>

              {/* STEP 2 ACTIONS */}
              <div className="pt-3 flex items-center justify-between gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSkipFromStep2}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                  >
                    Bỏ qua
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSavePetAndProfile}
                    className="px-6 py-2.5 rounded-xl bg-[#1D7980] hover:bg-[#155e63] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Lưu</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINISH */}
          {step === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#1A1F1E]">Đã hoàn tất</h3>
                <p className="text-xs text-[#66706E] mt-0.5">
                  Đã lưu hồ sơ <strong>{petName}</strong> vào tài khoản của bạn.
                </p>
              </div>

              {/* Simple Voucher Pill */}
              <div className="p-3.5 rounded-2xl bg-[#E8F4F5] border border-[#1D7980]/20 text-left flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-[#EE6952]" />
                  <div>
                    <span className="text-xs font-bold text-[#1A1F1E] block">
                      Voucher PETCARENEW (Giảm 20%)
                    </span>
                    <span className="text-[11px] text-[#66706E]">
                      Đã lưu trong ví voucher của bạn
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#1D7980]">
                  Sẵn sàng dùng
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleFinishAndBook}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1D7980] hover:bg-[#155e63] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Đặt lịch ngay</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (user?.id) {
                      localStorage.setItem(
                        `petcare_walkthrough_${user.id}`,
                        "completed",
                      );
                    }
                    onClose();
                    navigatePostOnboarding();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Vào tài khoản
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
