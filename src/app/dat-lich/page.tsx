"use client";

import { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { CustomerFlowProgress, CustomerSiteFrame } from "@/components/layout/customer-ui";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  CalendarIcon,
  Clock,
  Sunrise,
  Sunset,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Loader2,
  CreditCard,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useServices } from "@/hooks/use-services";
import { useAvailableSlots, useCreateBookingV2, BookingItem } from "@/hooks/use-bookings";
import { useMyPets, useCreatePet } from "@/hooks/use-pets";
import { useAuthStore } from "@/stores/auth-store";
import { QuickAuthModal } from "@/components/auth/quick-auth-modal";
import {
  formatServicePriceTierLabel,
  getApplicableServicePriceTier,
  getApplicableServicePriceTiers,
} from "@/lib/service-pricing";
import {
  resolveContactField,
  resolvePetSelection,
  resolveSpaTime,
} from "@/lib/booking-form-state";

function BookingContent() {
  const searchParams = useSearchParams();
  const preService = searchParams.get("service");
  const preWeight = searchParams.get("weight");
  const preBreed = searchParams.get("breed");
  const prePetId = searchParams.get("petId");

  const { user, isAuthenticated } = useAuthStore();
  const { data: servicesData, isLoading: isServicesLoading } = useServices();
  const { data: userPets } = useMyPets(isAuthenticated);
  const createPetMutation = useCreatePet();
  const createBookingV2Mutation = useCreateBookingV2();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [createdBooking, setCreatedBooking] = useState<BookingItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Form State
  const [selectedPetIdOverride, setSelectedPetIdOverride] = useState<string | null>(null);
  const [customPet, setCustomPet] = useState({
    name: preBreed ? `${preBreed.split(" ")[0]}` : "",
    species: "DOG" as "DOG" | "CAT",
    breed: preBreed || "Poodle",
    weightKg: preWeight && Number.isFinite(Number(preWeight)) ? Number(preWeight) : 0,
  });

  const [selectedServiceOverride, setSelectedServiceOverride] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  // SPA Schedule State
  const [spaDate, setSpaDate] = useState<Date>(() => new Date());
  const [spaTimeOverride, setSpaTimeOverride] = useState<string | null>(null);

  const [contactNameOverride, setContactNameOverride] = useState<string | null>(null);
  const [contactPhoneOverride, setContactPhoneOverride] = useState<string | null>(null);
  const [contactEmailOverride, setContactEmailOverride] = useState<string | null>(null);
  const [customerNote, setCustomerNote] = useState<string>("");

  const contactName = resolveContactField(contactNameOverride, user?.name);
  const contactPhone = resolveContactField(contactPhoneOverride, user?.phone);
  const contactEmail = resolveContactField(contactEmailOverride, user?.email);
  const selectedPetId = selectedPetIdOverride ?? (
    prePetId && userPets?.some((pet) => pet.id === prePetId)
      ? prePetId
      : resolvePetSelection(userPets, preBreed, null)
  );

  // Tách dịch vụ chính và dịch vụ bổ sung.
  const mainServices = useMemo(() => {
    return servicesData?.filter((s) => !s.isAddon) || [];
  }, [servicesData]);

  const addonServices = useMemo(() => {
    return servicesData?.filter((s) => s.isAddon) || [];
  }, [servicesData]);

  // Preselect only a service explicitly requested by a service-card link.
  const requestedService = preService
    ? mainServices.find((service) => service.id === preService || service.slug === preService)
    : undefined;
  const selectedServiceId = selectedServiceOverride ?? requestedService?.id ?? "";

  // Selected services list for calculating dynamic duration & available slots
  const selectedServiceIds = useMemo(() => {
    return [selectedServiceId, ...selectedAddOnIds].filter(Boolean);
  }, [selectedServiceId, selectedAddOnIds]);

  // Query available slots dynamically based on pet and services
  const formattedSpaDate = format(spaDate, "yyyy-MM-dd");
  const {
    data: availableSlotsData,
    isLoading: isSlotsLoading,
    isError: isSlotsError,
    error: slotsError,
    refetch: refetchSlots,
  } = useAvailableSlots({
    date: formattedSpaDate,
    serviceIds: selectedServiceIds,
    petId: selectedPetId !== "new" ? selectedPetId : undefined,
    weightKg: selectedPetId === "new" && customPet.weightKg > 0 ? customPet.weightKg : undefined,
    enabled: selectedPetId !== "new" || customPet.weightKg > 0,
  });
  const availableSlots = availableSlotsData?.slots ?? [];
  const spaTime = resolveSpaTime(availableSlotsData?.slots, spaTimeOverride);

  // Active service object
  const currentService = mainServices.find((s) => s.id === selectedServiceId);

  // Active pet object
  const currentPet = useMemo(() => {
    if (selectedPetId === "new") {
      const defaultName = customPet.species === "DOG" ? "Chó" : "Mèo";
      return {
        id: "new",
        name: customPet.name.trim() || defaultName,
        weightKg: customPet.weightKg,
        breed: customPet.breed || "Chưa xác định",
        species: customPet.species,
      };
    }
    const found = userPets?.find((p) => p.id === selectedPetId);
    if (found) return found;
    return {
      id: "sample",
      name: "Chó / Mèo",
      weightKg: 0,
      breed: "Poodle",
      species: "DOG" as const,
    };
  }, [selectedPetId, customPet, userPets]);

  const applicablePriceTiers = useMemo(
    () => getApplicableServicePriceTiers(currentService?.priceTiers ?? [], currentPet.species),
    [currentService, currentPet.species],
  );
  const currentPriceTier = useMemo(
    () => getApplicableServicePriceTier(currentService?.priceTiers ?? [], currentPet.species, currentPet.weightKg),
    [currentService, currentPet.species, currentPet.weightKg],
  );

  const weightLimitMessage = useMemo(() => {
    if (!Number.isFinite(currentPet.weightKg) || currentPet.weightKg <= 0) {
      return "Vui lòng nhập cân nặng ước tính để xem giá dự kiến.";
    }
    if (currentPriceTier) return null;

    if (currentPet.weightKg > 20) {
      return "Rất tiếc, dịch vụ này hiện chỉ nhận thú cưng đến tối đa 20 kg. Vui lòng chọn dịch vụ phù hợp hoặc liên hệ tiệm để được tư vấn.";
    }

    const finalTier = applicablePriceTiers.at(-1);
    if (finalTier && currentPet.weightKg > finalTier.maxWeight) {
      return `Rất tiếc, dịch vụ này hiện chỉ nhận thú cưng đến tối đa ${finalTier.maxWeight} kg. Vui lòng chọn dịch vụ phù hợp hoặc liên hệ tiệm để được tư vấn.`;
    }

    return "Rất tiếc, dịch vụ này hiện chưa có mức giá phù hợp với cân nặng của thú cưng. Vui lòng liên hệ tiệm để được tư vấn.";
  }, [currentPriceTier, applicablePriceTiers, currentPet.weightKg]);

  const getAddOnsPrice = () => {
    return selectedAddOnIds.reduce((sum, id) => {
      const addon = addonServices.find((a) => a.id === id);
      const price = addon?.priceTiers?.[0]?.price || 0;
      return sum + price;
    }, 0);
  };

  const subtotal = currentPriceTier ? currentPriceTier.price + getAddOnsPrice() : null;

  const formatVND = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!selectedServiceId) {
        setErrorMessage("Vui lòng chọn dịch vụ chính trước khi tiếp tục.");
        return;
      }
      if (!contactName.trim() || !contactPhone.trim()) {
        setErrorMessage("Vui lòng điền họ tên và số điện thoại liên hệ.");
        return;
      }
      if (!Number.isFinite(currentPet.weightKg) || currentPet.weightKg <= 0) {
        setErrorMessage("Vui lòng nhập cân nặng ước tính hợp lệ cho thú cưng.");
        return;
      }
    }
    if (currentStep === 2 && !currentPriceTier) {
      setErrorMessage(weightLimitMessage);
      return;
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const executeBooking = async () => {
    if (!selectedServiceId) {
      setErrorMessage("Vui lòng chọn dịch vụ chính trước khi đặt lịch.");
      return;
    }
    if (!Number.isFinite(currentPet.weightKg) || currentPet.weightKg <= 0) {
      setErrorMessage("Vui lòng nhập cân nặng ước tính hợp lệ cho thú cưng.");
      return;
    }
    if (!currentPriceTier) {
      setErrorMessage(weightLimitMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalPetId = selectedPetId;

      // If user is adding a new pet, create it first
      if (selectedPetId === "new") {
        const fallbackName = customPet.species === "DOG" ? "Chó" : "Mèo";
        const createdPet = await createPetMutation.mutateAsync({
          name: customPet.name.trim() || fallbackName,
          species: customPet.species,
          breed: customPet.breed.trim() || "Chưa xác định",
          weightKg: Number(customPet.weightKg),
          hasVaccine: true,
          behavioralFlag: "NORMAL",
          notes: "Khách tạo khi đặt lịch trực tuyến",
        });
        finalPetId = createdPet.id;
      }

      // Prepare payload for Booking V2
      const allServiceIds = [selectedServiceId, ...selectedAddOnIds].filter(Boolean);
      const startAt = `${formattedSpaDate}T${spaTime}:00+07:00`;

      const booking = await createBookingV2Mutation.mutateAsync({
        petId: finalPetId,
        serviceIds: allServiceIds,
        startAt,
        staffNote: customerNote.trim() || undefined,
      });
      setCreatedBooking(booking);

      window.scrollTo({ top: 0, behavior: "smooth" });
      try {
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#244B3F", "#C9684D", "#8A9A7A", "#8A9A7A"],
        });
      } catch {}
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : "Đặt lịch không thành công. Vui lòng kiểm tra lại khung giờ còn trống.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteBooking = async () => {
    setErrorMessage(null);

    if (!spaDate || !spaTime) {
      setErrorMessage("Vui lòng chọn ngày và khung giờ hẹn dịch vụ Spa.");
      return;
    }

    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    await executeBooking();
  };

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const getSlotIcon = (time: string) => {
    if (time.includes("08") || time.includes("10") || time.includes("11")) {
      return <Sunrise className="w-4 h-4 text-[#C9684D]" />;
    }
    if (time.includes("17") || time.includes("18")) {
      return <Sunset className="w-4 h-4 text-[#244B3F]" />;
    }
    return <Clock className="w-4 h-4 text-[#65716A]" />;
  };

  return (
    <CustomerSiteFrame className="customer-site-frame--focused-flow selection:bg-[#244B3F] selection:text-white">
        <main className="flex w-full flex-1 items-start justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex min-h-[680px] w-full max-w-[1240px] flex-col overflow-hidden rounded-3xl border border-[#DEDAD0] bg-[#FFFDF8] shadow-sm">
            {/* GLOBAL HEADER FOR BOOKING */}
            <div className="relative z-20 border-b border-[#DEDAD0] bg-[#FFFDF8] px-5 pb-6 pt-8 text-left sm:px-8 sm:pt-10">
              <span className="mb-2 block text-xs font-semibold text-[#244B3F]">
                {createdBooking ? "Đã tiếp nhận lịch" : "Đặt lịch Spa và Grooming"}
              </span>
              <h1 className="mb-6 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#1B3C33] sm:mb-8 sm:text-4xl">
                {createdBooking ? "Lịch hẹn đã được tiếp nhận" : "Đặt lịch Spa và Grooming"}
              </h1>

              {!createdBooking && <CustomerFlowProgress steps={["Thông tin", "Dịch vụ", "Khung giờ"]} currentStep={currentStep} />}
            </div>

            {/* ERROR BANNER */}
            {errorMessage && (
              <div className="mx-4 sm:mx-8 mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* SUCCESS SCREEN */}
            {createdBooking ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in-95 duration-500 bg-white">
                <div className="w-20 h-20 rounded-full bg-[#E5ECE3] flex items-center justify-center mb-6 ring-8 ring-[#E5ECE3]/50">
                  <Check className="w-10 h-10 text-[#244B3F] stroke-[3]" />
                </div>

                <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-[#8A9A7A] bg-[#8A9A7A]/10 text-[#637650] font-bold text-xs mb-3">
                  Mã lịch hẹn: <span className="break-all">#{createdBooking.code}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#253B33] tracking-tight mb-3">
                  Đặt lịch Spa thành công
                </h2>
                <p className="text-base text-[#65716A] max-w-lg mx-auto leading-relaxed mb-8">
                  Lịch hẹn của bạn đã được ghi nhận vào hệ thống.
                </p>

                {/* Booking summary card */}
                <div className="max-w-2xl w-full bg-[#F8F5EF] border border-[#DEDAD0] rounded-3xl p-6 sm:p-8 text-left mb-6 shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-[#DEDAD0]">
                    <div className="min-w-0">
                      <span className="text-xs text-[#65716A] block font-medium">Khách hàng</span>
                      <strong className="break-words text-base text-[#253B33]">{contactName} ({contactPhone})</strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-[#65716A] block font-medium">Chó / Mèo</span>
                      <strong className="break-words text-base text-[#253B33]">{currentPet.name} ({currentPet.weightKg}kg • {currentPet.species === "DOG" ? "Chó" : "Mèo"})</strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-[#65716A] block font-medium">Dịch vụ đã chọn</span>
                        <strong className="break-words text-base text-[#244B3F]">{currentService?.name ?? "Chưa chọn dịch vụ"}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-[#65716A] block font-medium">Thời gian hẹn</span>
                      <strong className="break-words text-base text-[#253B33]">
                        {spaTime || "Giờ hẹn"}, {format(spaDate, "dd/MM/yyyy")}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-xs text-[#65716A] block font-medium">Thanh toán</span>
                      <div className="font-bold text-sm text-[#253B33] flex items-center gap-1.5 mt-0.5">
                        <CreditCard className="w-4 h-4 text-[#244B3F]" /> Thanh toán tại quầy
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-[#65716A] block font-medium">Chi phí dự kiến</span>
                      <span className="text-2xl font-black text-[#244B3F] tabular-nums">
                        {formatVND(createdBooking.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct action reminder for customer */}
                <div className="max-w-2xl w-full p-4 rounded-2xl bg-[#E5ECE3] border border-[#244B3F]/20 text-xs text-left mb-8 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#244B3F] shrink-0" />
                  <p className="min-w-0 break-words text-[#253B33] font-medium leading-relaxed">
                    Giờ hẹn là giờ bạn đến; báo mã lịch ở trên khi tới tiệm. Nhân viên sẽ cân lại, xác nhận giá trước khi làm và báo bạn khi bé sẵn sàng đón.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <Link
                    href="/tai-khoan"
                    className="px-8 py-3.5 bg-[#244B3F] text-white font-bold rounded-full hover:bg-[#1B3C33] transition-colors w-full sm:w-auto text-sm text-center shadow-sm"
                  >
                    Xem lịch hẹn của tôi
                  </Link>
                  <button
                    onClick={() => {
                      setCreatedBooking(null);
                      setCurrentStep(1);
                    }}
                    className="px-8 py-3.5 bg-white text-[#253B33] border border-[#DEDAD0] font-bold rounded-full hover:bg-[#F8F5EF] transition-colors w-full sm:w-auto text-sm"
                  >
                    Đặt thêm lịch
                  </button>
                </div>
              </div>
            ) : (
              /* FORM SCREEN (Split Layout) */
              <div className="flex flex-col lg:flex-row flex-1 bg-white relative z-10 overflow-hidden">
                {/* LEFT COLUMN: RECEIPT */}
                <div className="w-full lg:w-[35%] bg-[#F8F5EF] p-5 sm:p-8 border-r border-[#DEDAD0] flex flex-col justify-between">
                  <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-[#DEDAD0] lg:sticky lg:top-8">
                    <h3 className="text-xs tracking-wide font-bold text-[#244B3F] mb-4 border-b border-[#DEDAD0] pb-3">
                      Chi tiết lịch hẹn
                    </h3>

                    <div className="space-y-4 text-sm font-medium">
                      <div className="flex min-w-0 justify-between gap-3 items-start">
                        <span className="shrink-0 text-[#65716A]">Chó / Mèo</span>
                        <span className="min-w-0 break-words text-right text-[#253B33] font-bold">
                          {currentPet.name} <br />
                          <span className="text-[10px] text-[#65716A] font-normal">
                            {currentPet.weightKg > 0 ? `${currentPet.weightKg} kg` : "Chưa nhập cân"} • {currentPet.species === "DOG" ? "Chó" : "Mèo"}
                          </span>
                        </span>
                      </div>


                      {spaDate && spaTime && (
                        <div className="flex min-w-0 justify-between gap-3 items-start">
                          <span className="shrink-0 text-[#65716A]">Khung giờ hẹn</span>
                          <span className="min-w-0 break-words text-right text-[#244B3F] font-bold">
                            {spaTime} <br />
                            <span className="text-[10px] text-[#65716A] font-normal">
                              {format(spaDate, "dd/MM/yyyy")}
                            </span>
                          </span>
                        </div>
                      )}

                      <div className="flex min-w-0 justify-between gap-3 items-start pt-3 border-t border-[#DEDAD0]">
                        <span className="min-w-0 flex-1 break-words text-[#253B33] font-bold leading-tight">
                          {currentService?.name ?? "Chưa chọn dịch vụ"}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-[#244B3F] font-bold tabular-nums">
                          {!currentService
                            ? "Chọn dịch vụ"
                            : currentPriceTier
                              ? formatVND(currentPriceTier.price)
                              : currentPet.weightKg > 0
                                ? "Không áp dụng"
                                : "Nhập cân nặng"}
                        </span>
                      </div>

                      {selectedAddOnIds.map((id) => {
                        const addon = addonServices.find((a) => a.id === id);
                        if (!addon) return null;
                        const price = addon.priceTiers?.[0]?.price || 0;
                        return (
                          <div key={id} className="flex min-w-0 justify-between gap-3 items-start">
                            <span className="min-w-0 flex-1 break-words text-[#65716A] text-xs">+ {addon.name}</span>
                            <span className="shrink-0 whitespace-nowrap text-[#253B33] text-xs font-semibold tabular-nums">
                              {formatVND(price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#DEDAD0] space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[#65716A] text-xs font-bold tracking-wide">
                          Chi phí dịch vụ
                        </span>
                        <span className="text-base font-bold text-[#253B33] tabular-nums">
                          {subtotal === null ? "—" : formatVND(subtotal)}
                        </span>
                      </div>

                      <div className="flex justify-between items-end pt-3 border-t border-[#DEDAD0]">
                        <span className="text-[#253B33] text-xs font-black tracking-wide">
                          Tạm tính
                        </span>
                        <span className="text-2xl font-black text-[#244B3F] tracking-tight tabular-nums">
                          {subtotal === null ? "—" : formatVND(subtotal)}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#65716A] pt-2">
                        Thanh toán tại quầy
                      </div>
                    </div>

                  </div>

                  {/* Auth status notice on left pane - only shown if not logged in */}
                  {!isAuthenticated && (
                    <div className="mt-6 p-4 rounded-2xl bg-white border border-[#DEDAD0] text-xs space-y-2">
                      <span className="text-[#253B33] font-bold block">Tài khoản thành viên</span>
                      <p className="text-[11px] text-[#65716A] leading-relaxed">
                        Đăng nhập để tự động điền thông tin và theo dõi lịch hẹn.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="w-full py-2.5 px-3 bg-[#244B3F] hover:bg-[#1B3C33] text-white rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center mt-2 shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Đăng nhập
                      </button>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: STEP CONTENT */}
                <div className="w-full min-w-0 lg:w-[65%] p-5 sm:p-8 relative flex flex-col justify-between">
                  <div className="flex-1">
                    {/* STEP 1: CONTACT & PET */}
                    {currentStep === 1 && (
                      <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6 pb-8">
                        {/* 1. Main Service Visual Selector */}
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-[#253B33] tracking-wide">
                            Dịch vụ cần đặt
                          </label>
                          {isServicesLoading ? (
                            <div className="flex items-center justify-center p-8 bg-[#F8F5EF] rounded-2xl">
                              <Loader2 className="w-6 h-6 animate-spin text-[#244B3F]" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {mainServices.map((srv) => {
                                const isActive = selectedServiceId === srv.id;
                                return (
                                  <button
                                    key={srv.id}
                                    type="button"
                                    onClick={() => setSelectedServiceOverride(srv.id)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                                      isActive
                                        ? "border-[#244B3F] bg-[#F8F5EF] shadow-sm scale-[1.02]"
                                        : "border-[#DEDAD0] bg-white hover:border-[#253B33]/20 hover:bg-[#F8F5EF]"
                                    }`}
                                  >
                                    <div className="flex min-w-0 justify-between items-start gap-2 mb-2">
                                      <span className="min-w-0 break-words font-bold text-[#253B33] leading-tight text-sm">
                                        {srv.name}
                                      </span>
                                      {isActive && <div className="w-2.5 h-2.5 rounded-full bg-[#244B3F]" />}
                                    </div>
                                    <span className="text-xs text-[#65716A] line-clamp-1">
                                      {srv.tagline || "Spa chăm sóc & tạo kiểu"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {!isServicesLoading && !currentService && (
                            <p className="text-xs text-[#65716A]">
                              Chọn một dịch vụ để xem giá tạm tính và tiếp tục.
                            </p>
                          )}
                        </div>

                        {/* Customer contact fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[#DEDAD0]">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#253B33]">Họ tên khách hàng *</label>
                            <input
                              type="text"
                              value={contactName}
                              onChange={(e) => setContactNameOverride(e.target.value)}
                              placeholder="Ví dụ: Trần Minh Quân"
                              className="w-full px-4 py-3 rounded-xl bg-[#F8F5EF] border border-[#DEDAD0] focus:bg-white focus:border-[#244B3F] outline-none text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#253B33]">Số điện thoại *</label>
                            <input
                              type="tel"
                              value={contactPhone}
                              onChange={(e) => setContactPhoneOverride(e.target.value)}
                              placeholder="Ví dụ: 0987654321"
                              className="w-full px-4 py-3 rounded-xl bg-[#F8F5EF] border border-[#DEDAD0] focus:bg-white focus:border-[#244B3F] outline-none text-sm"
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-[#253B33]">Email nhận thông báo</label>
                            <input
                              type="email"
                              value={contactEmail}
                              onChange={(e) => setContactEmailOverride(e.target.value)}
                              placeholder="customer@petcare.vn"
                              className="w-full px-4 py-3 rounded-xl bg-[#F8F5EF] border border-[#DEDAD0] focus:bg-white focus:border-[#244B3F] outline-none text-sm"
                            />
                          </div>
                        </div>

                        {/* Pet Selection */}
                        <div className="space-y-4 pt-4 border-t border-[#DEDAD0]">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-[#253B33]">Thú cưng *</label>
                              {isAuthenticated && (
                                <span className="text-[11px] text-[#244B3F] font-semibold">
                                  {userPets?.length || 0} đã lưu
                                </span>
                              )}
                            </div>
                            <Select
                              items={[{ value: "new", label: "+ Thêm thú cưng mới" }, ...(userPets ?? []).map((pet) => ({ value: pet.id, label: pet.name }))]}
                              value={selectedPetId}
                              onValueChange={(val) => {
                                setSelectedPetIdOverride(val || "new");
                              }}
                            >
                              <SelectTrigger className="w-full px-4 py-5 rounded-xl bg-[#F8F5EF] border border-[#DEDAD0] focus:ring-0 focus:border-[#244B3F] text-sm">
                                <SelectValue placeholder="Chọn thú cưng">
                                  {selectedPetId === "new"
                                    ? "+ Thêm thú cưng mới"
                                    : userPets?.find((p) => p.id === selectedPetId)?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {userPets &&
                                  userPets.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name} ({p.weightKg}kg • {p.species === "DOG" ? "Chó" : "Mèo"})
                                    </SelectItem>
                                  ))}
                                <SelectItem value="new">+ Thêm thú cưng mới</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedPetId === "new" && (
                            <div className="p-4 rounded-xl border border-[#244B3F]/30 bg-[#E5ECE3]/30 space-y-4 animate-in fade-in">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-[#253B33]">Tên thú cưng (Tùy chọn)</label>
                                  <input
                                    type="text"
                                    placeholder="VD: Milo"
                                    className="w-full p-2.5 text-sm rounded-lg border border-[#DEDAD0] bg-white"
                                    value={customPet.name}
                                    onChange={(e) => setCustomPet({ ...customPet, name: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-[#253B33]">Loài (Chó / Mèo) *</label>
                                  <select
                                    className="w-full p-2.5 text-sm rounded-lg border border-[#DEDAD0] bg-white"
                                    value={customPet.species}
                                    onChange={(e) => {
                                      setCustomPet({
                                        ...customPet,
                                        species: e.target.value as "DOG" | "CAT",
                                      });
                                    }}
                                  >
                                    <option value="DOG">Chó</option>
                                    <option value="CAT">Mèo</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-[#253B33]">Cân nặng ước tính (kg) *</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0.5"
                                    max="100"
                                    className="w-full p-2.5 text-sm rounded-lg border border-[#DEDAD0] bg-white"
                                    value={customPet.weightKg || ""}
                                    onChange={(e) => {
                                      setCustomPet({
                                        ...customPet,
                                        weightKg: parseFloat(e.target.value) || 0,
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                        </div>


                      </div>
                    )}

                    {/* STEP 2: SERVICES & PRICING TABLE */}
                    {currentStep === 2 && (
                      <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-8 pb-8">
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-[#253B33] tracking-wide block">
                            Giá dự kiến theo cân nặng ({currentPet.name}: {currentPet.weightKg} kg)
                          </label>
                          <p className="text-xs leading-relaxed text-[#65716A]">
                            Giá tạm tính theo cân nặng này; nhân viên sẽ xác nhận với bạn trước khi làm.
                          </p>
                          <div className="border border-[#DEDAD0] rounded-2xl overflow-hidden shadow-xs">
                            <div className="divide-y divide-[#DEDAD0]">
                              {applicablePriceTiers.map((tier) => {
                                const isApplicable = currentPriceTier?.id === tier.id;
                                return (
                                  <div
                                    key={tier.id}
                                    className={`flex min-w-0 justify-between items-center gap-3 p-3.5 transition-colors ${
                                      isApplicable ? "bg-[#244B3F]/10 font-bold" : "bg-white"
                                    }`}
                                  >
                                    <span className={`min-w-0 break-words text-sm ${isApplicable ? "text-[#253B33]" : "text-[#65716A]"}`}>
                                      {formatServicePriceTierLabel(tier, applicablePriceTiers, false)}
                                    </span>
                                    <div className="flex shrink-0 items-center gap-3">
                                      <span className={`tabular-nums ${isApplicable ? "text-[#244B3F] font-black text-base" : "text-[#253B33]"}`}>
                                        {formatVND(tier.price)}
                                      </span>
                                      {isApplicable && <Check className="w-4 h-4 text-[#244B3F]" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {!currentPriceTier && (
                            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
                              <p>{weightLimitMessage}</p>
                            </div>
                          )}
                        </div>

                        {/* Addons Selection */}
                        <div className="pt-6 border-t border-[#DEDAD0]">
                          <label className="text-xs font-bold text-[#253B33] tracking-wide block mb-3">
                            Dịch vụ bổ sung
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {addonServices.map((addon) => {
                              const isSelected = selectedAddOnIds.includes(addon.id);
                              const price = addon.priceTiers?.[0]?.price || 0;
                              return (
                                <button
                                  key={addon.id}
                                  type="button"
                                  aria-pressed={isSelected}
                                  onClick={() =>
                                    setSelectedAddOnIds((prev) =>
                                      isSelected ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
                                    )
                                  }
                                  className={`w-full p-3.5 rounded-xl border cursor-pointer flex justify-between items-start gap-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#244B3F] focus-visible:ring-offset-2 ${
                                    isSelected
                                      ? "border-[#244B3F] bg-[#F8F5EF]"
                                      : "border-[#DEDAD0] bg-white hover:border-[#244B3F]/50"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <span className="break-words text-sm font-medium text-[#253B33] block">{addon.name}</span>
                                    <span className="text-[11px] text-[#65716A]">Chọn thêm nếu cần</span>
                                  </div>
                                  <span className="shrink-0 whitespace-nowrap text-xs font-bold text-[#244B3F] tabular-nums">
                                    +{formatVND(price)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Customer note */}
                        <div className="pt-4 border-t border-[#DEDAD0] space-y-1.5">
                          <label className="text-xs font-bold text-[#253B33]">Ghi chú</label>
                          <textarea
                            rows={2}
                            value={customerNote}
                            onChange={(e) => setCustomerNote(e.target.value)}
                            placeholder="Ghi chú thêm (nếu có)..."
                            className="w-full px-4 py-3 rounded-xl bg-[#F8F5EF] border border-[#DEDAD0] focus:bg-white focus:border-[#244B3F] outline-none text-sm resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* STEP 3: DATE & TIME */}
                    {currentStep === 3 && (
                      <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6 pb-8">
                        <div>
                          <h2 className="text-xl font-bold text-[#253B33] mb-1">Chọn khung giờ hẹn</h2>
                          <p className="text-xs text-[#65716A]">
                            Chọn ngày và giờ hẹn phù hợp.
                          </p>
                        </div>

                        {/* Date buttons */}
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-[#253B33]">
                            1. Chọn ngày hẹn
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSpaDate(today)}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                                isSameDay(spaDate, today)
                                  ? "bg-[#253B33] text-white border-[#253B33]"
                                  : "bg-white text-[#65716A] border-[#DEDAD0] hover:border-[#253B33]/30"
                              }`}
                            >
                              Hôm nay ({format(today, "dd/MM")})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpaDate(tomorrow)}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                                isSameDay(spaDate, tomorrow)
                                  ? "bg-[#253B33] text-white border-[#253B33]"
                                  : "bg-white text-[#65716A] border-[#DEDAD0] hover:border-[#253B33]/30"
                              }`}
                            >
                              Ngày mai ({format(tomorrow, "dd/MM")})
                            </button>
                            <Popover>
                              <PopoverTrigger>
                                <div
                                  className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer",
                                    !isSameDay(spaDate, today) && !isSameDay(spaDate, tomorrow)
                                      ? "bg-[#253B33] text-white border-[#253B33]"
                                      : "bg-white text-[#65716A] border-[#DEDAD0]"
                                  )}
                                >
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                  {!isSameDay(spaDate, today) && !isSameDay(spaDate, tomorrow)
                                    ? format(spaDate, "dd/MM/yyyy")
                                    : "Ngày khác"}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={spaDate}
                                  onSelect={(d) => d && setSpaDate(d)}
                                  locale={vi}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Slot buttons */}
                        <div className="space-y-3 pt-4 border-t border-[#DEDAD0]">
                          <label className="text-xs font-bold text-[#253B33]">
                            2. Khung giờ hẹn khả dụng ({formattedSpaDate})
                          </label>
                          <div className="space-y-1">
                            <p className="text-[11px] text-[#65716A]">Giờ mở cửa 08:30–18:30 mỗi ngày. Không nhận giờ bắt đầu mới trong 14:00–15:00; lịch đã bắt đầu vẫn tiếp tục.</p>
                            <p className="text-[11px] leading-relaxed text-[#65716A]">Giờ hẹn là giờ dự kiến bạn đến; thời gian chăm sóc thực tế có thể thay đổi. Nhân viên sẽ báo khi thú cưng sẵn sàng đón. Giá tạm tính theo cân nặng ước tính và sẽ được trao đổi trước khi bắt đầu nếu thay đổi.</p>
                          </div>

                          {isSlotsLoading ? (
                            <div className="p-8 text-center bg-[#F8F5EF] rounded-2xl">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#244B3F]" />
                            </div>
                          ) : isSlotsError ? (
                            <div className="flex flex-col items-center gap-3 p-5 text-center text-sm text-[#AE553E] bg-[#F5E8E1] rounded-xl">
                              <p>{slotsError instanceof Error ? slotsError.message : "Chưa tải được lịch khả dụng."}</p>
                              <button
                                type="button"
                                onClick={() => void refetchSlots()}
                                className="rounded-lg border border-[#C9684D] px-3 py-2 font-semibold hover:bg-white"
                              >
                                Thử tải lại
                              </button>
                            </div>
                          ) : (
                            availableSlots.some((slot) => slot.available) ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {availableSlots.map((slot) => {
                                  const isSelected = spaTime === slot.time;
                                  const isAvailable = slot.available;
                                  return (
                                    <button
                                      key={slot.time}
                                      type="button"
                                      disabled={!isAvailable}
                                      onClick={() => setSpaTimeOverride(slot.time)}
                                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                                        !isAvailable
                                          ? "opacity-35 bg-gray-50 border-gray-200 cursor-not-allowed"
                                          : isSelected
                                          ? "border-[#244B3F] bg-[#244B3F] text-white shadow-sm"
                                          : "border-[#DEDAD0] bg-white hover:border-[#253B33]/30"
                                      }`}
                                    >
                                      <div className="flex items-center justify-center gap-1.5 mb-1">
                                        {getSlotIcon(slot.time)}
                                        <span className="text-xs font-bold tracking-tight">
                                          {slot.time}
                                        </span>
                                      </div>
                                      <span
                                        className={`text-[10px] block ${
                                          isSelected ? "text-white/80" : "text-[#65716A]"
                                        }`}
                                      >
                                        {isAvailable ? `Còn ${slot.remaining} chỗ` : slot.unavailableReason === "SHIFT_HANDOVER" ? "Bàn giao ca" : "Đã kín"}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#F8F5EF] px-5 py-6 text-center">
                                <p className="text-sm font-semibold text-[#253B33]">
                                  {isSameDay(spaDate, today)
                                    ? "Hôm nay không còn khung giờ trống."
                                    : "Ngày này hiện không còn khung giờ trống."}
                                </p>
                                <p className="text-xs text-[#65716A]">
                                  Chọn ngày khác để xem các giờ còn nhận lịch.
                                </p>
                                {isSameDay(spaDate, today) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSpaDate(tomorrow);
                                      setSpaTimeOverride(null);
                                    }}
                                    className="rounded-full bg-[#244B3F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1B3C33]"
                                  >
                                    Xem khung giờ ngày mai
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons (Bottom) */}
                  <div data-floating-contact-safe-zone className="pt-6 border-t border-[#DEDAD0] flex flex-col-reverse items-stretch gap-3 z-10 bg-white sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                      className={`w-full sm:w-auto justify-center sm:justify-start text-sm font-bold items-center gap-2 transition-colors ${
                        currentStep === 1 ? "hidden sm:inline-flex" : "inline-flex text-[#65716A] hover:text-[#253B33]"
                      }`}
                    >
                      <ArrowLeft className="w-4 h-4" /> Quay lại
                    </button>

                    {currentStep < 3 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full sm:w-auto justify-center rounded-full bg-[#253B33] text-white px-6 sm:px-8 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#244B3F] transition-all"
                      >
                        Tiếp tục <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCompleteBooking}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto justify-center rounded-full bg-[#244B3F] text-white px-6 sm:px-10 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#1B3C33] transition-all shadow-lg shadow-[#244B3F]/20 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang ghi nhận...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" /> Xác nhận đặt lịch
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      {/* Quick In-Place Auth Modal for Booking */}
      <QuickAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          // Automatically proceed with booking now that user is authenticated
          setTimeout(() => {
            executeBooking();
          }, 200);
        }}
        initialName={contactName}
        initialPhone={contactPhone}
        initialEmail={contactEmail}
      />
    </CustomerSiteFrame>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <CustomerSiteFrame className="customer-site-frame--focused-flow">
          <main className="flex flex-1 items-center justify-center bg-[#F8F5EF]">
          <div className="size-8 animate-spin rounded-full border-2 border-[#244B3F] border-t-transparent" />
          </main>
        </CustomerSiteFrame>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
