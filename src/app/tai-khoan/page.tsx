"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomerSiteFrame } from "@/components/layout/customer-ui";
import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/api-client";
import { formatLoyaltyCopy } from "@/lib/loyalty-copy";
import {
  useMyPets,
  useCreatePet,
  useUpdatePet,
  useDeletePet,
  PetItem,
} from "@/hooks/use-pets";
import { useUpdateProfile } from "@/hooks/use-users";
import { useMyOrders } from "@/hooks/use-orders";
import type { Order } from "@/hooks/use-orders";
import { useSepayAccountConfig } from "@/hooks/use-payment-config";
import { buildVietQrImageUrl } from "@/lib/payment-qr";
import { saveImageToDevice } from "@/lib/save-image-to-device";
import {
  useMyBookings,
  useCancelBooking,
  useAvailableSlots,
  useRescheduleBooking,
  BookingItem,
} from "@/hooks/use-bookings";
import {
  useMyVouchers,
  useRewardVouchers,
  useRedeemVoucher,
  VoucherItem,
} from "@/hooks/use-vouchers";
import { useMyReviews, useCreateReview } from "@/hooks/use-reviews";
import { useMyLoyaltyHistory } from "@/hooks/use-loyalty";
import {
  buildPetCareStartAt,
  canCustomerSelfServeBooking,
  formatPetCareDateValue,
  formatPetCareTimeValue,
} from "@/lib/booking-reschedule";
import { shouldOpenOnboardingWalkthrough } from "@/lib/onboarding-redirect";
import { getProfileTabFromSearch, type ProfileTab } from "@/lib/profile-tab";
import { OnboardingWalkthroughModal } from "@/components/profile/onboarding-walkthrough-modal";
import { LoyaltyHistoryCard } from "@/components/loyalty/loyalty-history-card";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  CalendarDays,
  Gift,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Award,
  Loader2,
  X,
  Tag,
  Ticket,
  Star,
  Check,
  ArrowRight,
  LogOut,
  Scissors,
  Copy,
  Edit2,
  Trash2,
  ShoppingBag,
  Package,
  KeyRound,
  Camera,
  Upload,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getBookingPaymentMessage } from "@/lib/booking-payment-presentation";
import { getBookingServiceLabels } from "@/lib/booking-service-labels";
import { useImageUploadPreview } from "@/hooks/use-image-upload-preview";

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = getProfileTabFromSearch(`?${searchParams.toString()}`);
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    logout,
    fetchProfile,
  } = useAuthStore();
  const {
    data: myPets,
    isLoading: isPetsLoading,
    isSuccess: isPetsSuccess,
  } = useMyPets(isAuthenticated);
  const { data: myBookings, isLoading: isBookingsLoading } =
    useMyBookings(isAuthenticated);
  const { data: myVouchers, isLoading: isVouchersLoading } =
    useMyVouchers(isAuthenticated);
  const { data: rewardVouchers, isLoading: isRewardsLoading } =
    useRewardVouchers();
  const { data: myReviews } = useMyReviews(isAuthenticated);
  const { data: myOrders, isLoading: isOrdersLoading } = useMyOrders();
  const orderQrAccount = useSepayAccountConfig("ORDER").data;

  useEffect(() => {
    if (isAuthenticated) void fetchProfile();
  }, [isAuthenticated, fetchProfile]);

  const createPetMutation = useCreatePet();
  const updatePetMutation = useUpdatePet();
  const deletePetMutation = useDeletePet();
  const updateProfileMutation = useUpdateProfile();
  const cancelBookingMutation = useCancelBooking();
  const rescheduleBookingMutation = useRescheduleBooking();
  const redeemVoucherMutation = useRedeemVoucher();
  const createReviewMutation = useCreateReview();

  const handleSaveOrderQr = async (order: Order) => {
    if (!order.paymentCode || savingQrOrderCode) return;
    const imageUrl = buildVietQrImageUrl(
      orderQrAccount,
      order.total,
      `THANHTOAN ${order.paymentCode}`,
    );
    if (!imageUrl) {
      toast.error("Mã QR chưa sẵn sàng.");
      return;
    }
    setSavingQrOrderCode(order.code);
    try {
      const result = await saveImageToDevice(
        imageUrl,
        `petcare-${order.code}.png`,
      );
      toast.success(
        result === "shared"
          ? "Chọn Lưu hình ảnh để lưu mã QR vào album."
          : "Đã tải ảnh mã QR về thiết bị.",
      );
    } catch {
      toast.error("Chưa lưu được ảnh. Hãy chạm giữ mã QR để lưu vào album.");
    } finally {
      setSavingQrOrderCode(null);
    }
  };

  const [savingQrOrderCode, setSavingQrOrderCode] = useState<string | null>(
    null,
  );
  const [bookingToReschedule, setBookingToReschedule] =
    useState<BookingItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccessMessage, setRescheduleSuccessMessage] = useState<
    string | null
  >(null);
  const {
    data: rescheduleSlotsData,
    isLoading: isRescheduleSlotsLoading,
    isError: isRescheduleSlotsError,
  } = useAvailableSlots({
    date: rescheduleDate,
    serviceIds:
      bookingToReschedule?.services.map((item) => item.serviceId) ?? [],
    petId: bookingToReschedule?.petId,
    weightKg: bookingToReschedule?.pet?.weightKg,
    enabled: !!bookingToReschedule && !!rescheduleDate,
  });
  const todayPetCareDate = formatPetCareDateValue();
  const currentPetCareTime = formatPetCareTimeValue(new Date());
  const originalBookingDate = bookingToReschedule?.startAt
    ? formatPetCareDateValue(new Date(bookingToReschedule.startAt))
    : null;
  const originalBookingTime = bookingToReschedule?.startAt
    ? formatPetCareTimeValue(bookingToReschedule.startAt)
    : null;
  const availableRescheduleSlots = (rescheduleSlotsData?.slots ?? []).filter(
    (slot) => {
      if (!slot.available) return false;
      if (
        rescheduleDate === todayPetCareDate &&
        slot.time <= currentPetCareTime
      )
        return false;
      if (
        rescheduleDate === originalBookingDate &&
        slot.time === originalBookingTime
      )
        return false;
      return true;
    },
  );
  const {
    data: loyaltyHistory,
    isLoading: isLoyaltyHistoryLoading,
    isError: isLoyaltyHistoryError,
  } = useMyLoyaltyHistory(isAuthenticated && activeTab === "points");
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState<boolean>(false);
  const [redirectUrlAfterWalkthrough, setRedirectUrlAfterWalkthrough] =
    useState<string | null>(null);

  // Auto-open walkthrough on first-time login (e.g. Google login with no phone, or newly registered)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const hasWalkthroughParam =
        params.get("walkthrough") === "1" || params.get("onboarding") === "1";
      const redirectParam = params.get("redirect");
      if (redirectParam) {
        setRedirectUrlAfterWalkthrough(redirectParam);
      }

      // Check conditions to auto-open walkthrough:
      // 1. Explicitly requested via query param
      // 2. User has no phone number (mandatory)
      // 3. User is first-time and hasn't completed walkthrough yet
      const isCompleted = localStorage.getItem(
        `petcare_walkthrough_${user.id}`,
      );
      const needsPhone = !user.phone || user.phone.trim() === "";

      if (
        shouldOpenOnboardingWalkthrough({
          hasWalkthroughParam,
          needsPhone,
          isCompleted: Boolean(isCompleted),
          hasLoadedPets: isPetsSuccess,
          petCount: myPets?.length,
        })
      ) {
        setIsWalkthroughOpen(true);
      }
    }
  }, [isAuthenticated, isPetsSuccess, user, myPets]);

  // Profile Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const profileAvatarPreview = useImageUploadPreview();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Change Password Modal State

  const [isSubmittingPasswordChange, setIsSubmittingPasswordChange] =
    useState(false);

  // Pet Modal State (Create)
  const [isAddPetModalOpen, setIsAddPetModalOpen] = useState(false);
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState<"DOG" | "CAT">("DOG");
  const [newPetBreed, setNewPetBreed] = useState("Poodle");
  const [newPetWeight, setNewPetWeight] = useState("4.5");
  const [newPetAgeMonths, setNewPetAgeMonths] = useState("");
  const [newPetAvatarUrl, setNewPetAvatarUrl] = useState("");
  const [newPetHasVaccine, setNewPetHasVaccine] = useState(true);
  const [newPetBehavioralFlag, setNewPetBehavioralFlag] = useState<
    "NORMAL" | "AGGRESSIVE" | "TIMID"
  >("NORMAL");
  const [newPetNotes, setNewPetNotes] = useState("");
  const [isSubmittingPet, setIsSubmittingPet] = useState(false);
  const [isUploadingPetAvatar, setIsUploadingPetAvatar] = useState(false);
  const [petAvatarError, setPetAvatarError] = useState<string | null>(null);
  const petAvatarPreview = useImageUploadPreview();
  const petAvatarInputRef = useRef<HTMLInputElement>(null);
  const editPetAvatarInputRef = useRef<HTMLInputElement>(null);

  // Pet Edit Modal State
  const [petToEdit, setPetToEdit] = useState<PetItem | null>(null);
  const [editPetName, setEditPetName] = useState("");
  const [editPetSpecies, setEditPetSpecies] = useState<"DOG" | "CAT">("DOG");
  const [editPetBreed, setEditPetBreed] = useState("");
  const [editPetWeight, setEditPetWeight] = useState("");
  const [editPetAgeMonths, setEditPetAgeMonths] = useState("");
  const [editPetAvatarUrl, setEditPetAvatarUrl] = useState("");
  const [editPetHasVaccine, setEditPetHasVaccine] = useState(false);
  const [editPetBehavioralFlag, setEditPetBehavioralFlag] = useState<
    "NORMAL" | "AGGRESSIVE" | "TIMID"
  >("NORMAL");
  const [editPetNotes, setEditPetNotes] = useState("");
  const [editPetError, setEditPetError] = useState<string | null>(null);
  const [isSubmittingEditPet, setIsSubmittingEditPet] = useState(false);

  // Pet Delete Modal State
  const [petToDelete, setPetToDelete] = useState<PetItem | null>(null);
  const [deletePetError, setDeletePetError] = useState<string | null>(null);
  const [isDeletingPet, setIsDeletingPet] = useState(false);

  // Cancel Booking State
  const [bookingToCancel, setBookingToCancel] = useState<BookingItem | null>(
    null,
  );
  const [bookingCancelReason, setBookingCancelReason] = useState("");
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);

  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState<BookingItem | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Redeem notification state
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedVoucherDetail, setSelectedVoucherDetail] =
    useState<VoucherItem | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/dang-nhap");
    }
  }, [mounted, isAuthenticated, isAuthLoading, router]);

  if (!mounted || isAuthLoading || !isAuthenticated) {
    return (
      <CustomerSiteFrame>
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#244B3F]" />
            <p className="text-xs text-[#65716A]">
              Đang kiểm tra thông tin tài khoản...
            </p>
          </div>
        </main>
      </CustomerSiteFrame>
    );
  }

  const formatVND = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (!profileName.trim()) {
      setProfileError("Họ tên không được để trống");
      return;
    }
    if (
      profilePhone.trim() &&
      !/^(0[3|5|7|8|9])[0-9]{8}$/.test(profilePhone.trim())
    ) {
      setProfileError(
        "Số điện thoại không đúng định dạng Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08, 09)",
      );
      return;
    }

    setIsSubmittingProfile(true);
    try {
      await updateProfileMutation.mutateAsync({
        name: profileName.trim(),
        phone: profilePhone.trim() || undefined,
        avatarUrl: profileAvatarUrl.trim() || undefined,
      });
      setIsEditProfileOpen(false);
    } catch (err: any) {
      setProfileError(err.message || "Không thể cập nhật hồ sơ cá nhân");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Vui lòng chọn file hình ảnh (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Kích thước file ảnh không được vượt quá 5MB.");
      return;
    }

    profileAvatarPreview.previewFile(file);
    setIsUploadingAvatar(true);
    setProfileError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post<{ url: string; publicId?: string }>(
        "/upload/image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res?.url) {
        setProfileAvatarUrl(res.url);
        profileAvatarPreview.clearPreview();
      } else {
        profileAvatarPreview.clearPreview();
        setProfileError("Chưa nhận được ảnh sau khi tải lên. Vui lòng thử lại.");
      }
    } catch (err) {
      profileAvatarPreview.clearPreview();
      setProfileError(
        err instanceof Error
          ? err.message
          : "Lỗi khi tải ảnh lên máy chủ. Vui lòng thử lại.",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePetAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPetAvatarError(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPetAvatarError("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPetAvatarError("Ảnh cần có dung lượng tối đa 5 MB.");
      return;
    }

    petAvatarPreview.previewFile(file);
    setIsUploadingPetAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post<{ url: string }>(
        "/upload/image",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (res?.url) {
        if (isEdit) {
          setEditPetAvatarUrl(res.url);
        } else {
          setNewPetAvatarUrl(res.url);
        }
        petAvatarPreview.clearPreview();
      } else {
        petAvatarPreview.clearPreview();
        setPetAvatarError("Chưa nhận được ảnh sau khi tải lên. Vui lòng thử lại.");
      }
    } catch (err) {
      petAvatarPreview.clearPreview();
      setPetAvatarError(
        err instanceof Error
          ? err.message
          : "Chưa thể tải ảnh thú cưng. Bạn thử lại sau ít phút.",
      );
    } finally {
      setIsUploadingPetAvatar(false);
    }
  };

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPetName.trim()) return;
    setIsSubmittingPet(true);
    try {
      await createPetMutation.mutateAsync({
        name: newPetName.trim(),
        species: newPetSpecies,
        breed: newPetBreed.trim() || "Chưa xác định",
        weightKg: parseFloat(newPetWeight) || 4.5,
        ageMonths: newPetAgeMonths ? parseInt(newPetAgeMonths, 10) : undefined,
        avatarUrl: newPetAvatarUrl.trim() || undefined,
        hasVaccine: newPetHasVaccine,
        behavioralFlag: newPetBehavioralFlag,
        notes: newPetNotes.trim() || undefined,
      });
      setIsAddPetModalOpen(false);
      setNewPetName("");
      setNewPetBreed("Poodle");
      setNewPetWeight("4.5");
      setNewPetAgeMonths("");
      setNewPetAvatarUrl("");
      setPetAvatarError(null);
      petAvatarPreview.clearPreview();
      setNewPetNotes("");
    } catch (err: any) {
      alert(
        err.message || "Chưa thể tạo hồ sơ thú cưng. Bạn thử lại sau ít phút.",
      );
    } finally {
      setIsSubmittingPet(false);
    }
  };

  const handleOpenEditPet = (pet: PetItem) => {
    petAvatarPreview.clearPreview();
    setPetAvatarError(null);
    setPetToEdit(pet);
    setEditPetName(pet.name);
    setEditPetSpecies(pet.species);
    setEditPetBreed(pet.breed || "");
    setEditPetWeight(String(pet.weightKg || ""));
    setEditPetAgeMonths(
      pet.ageMonths !== undefined && pet.ageMonths !== null
        ? String(pet.ageMonths)
        : "",
    );
    setEditPetAvatarUrl(pet.avatarUrl || "");
    setEditPetHasVaccine(!!pet.hasVaccine);
    setEditPetBehavioralFlag(pet.behavioralFlag || "NORMAL");
    setEditPetNotes(pet.notes || "");
    setEditPetError(null);
  };

  const handleUpdatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petToEdit) return;
    setEditPetError(null);
    if (!editPetName.trim()) {
      setEditPetError("Tên không được để trống");
      return;
    }

    setIsSubmittingEditPet(true);
    try {
      await updatePetMutation.mutateAsync({
        id: petToEdit.id,
        data: {
          name: editPetName.trim(),
          species: editPetSpecies,
          breed: editPetBreed.trim() || "Chưa xác định",
          weightKg: parseFloat(editPetWeight) || 4.5,
          ageMonths: editPetAgeMonths.trim()
            ? parseInt(editPetAgeMonths, 10)
            : null,
          avatarUrl: editPetAvatarUrl.trim() || undefined,
          hasVaccine: editPetHasVaccine,
          behavioralFlag: editPetBehavioralFlag,
          notes: editPetNotes.trim() || undefined,
        },
      });
      setPetToEdit(null);
    } catch (err: any) {
      setEditPetError(err.message || "Không thể cập nhật hồ sơ thú cưng");
    } finally {
      setIsSubmittingEditPet(false);
    }
  };

  const handleConfirmDeletePet = async () => {
    if (!petToDelete) return;
    setIsDeletingPet(true);
    setDeletePetError(null);
    try {
      await deletePetMutation.mutateAsync(petToDelete.id);
      setPetToDelete(null);
    } catch (err: any) {
      setDeletePetError(
        err.message ||
          "Không thể xóa hồ sơ thú cưng. Vui lòng kiểm tra lại nếu đang có lịch hẹn.",
      );
    } finally {
      setIsDeletingPet(false);
    }
  };

  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    setIsCancellingBooking(true);
    try {
      await cancelBookingMutation.mutateAsync({
        id: bookingToCancel.id,
        reason: bookingCancelReason.trim() || undefined,
      });
      setBookingToCancel(null);
      setBookingCancelReason("");
    } catch (err: any) {
      alert(err.message || "Không thể hủy lịch hẹn");
    } finally {
      setIsCancellingBooking(false);
    }
  };

  const handleRedeemVoucher = async (code: string) => {
    setRedeemSuccessMsg(null);
    try {
      await redeemVoucherMutation.mutateAsync(code);
      await fetchProfile();
      setRedeemSuccessMsg(
        `Đã đổi mã ${code}. Voucher được lưu trong ví của bạn.`,
      );
      setTimeout(() => setRedeemSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || "Không thể đổi voucher");
    }
  };

  const handleOpenReview = (booking: BookingItem) => {
    setReviewBooking(booking);
    setReviewRating(5);
    setReviewComment("");
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    const targetServiceId = reviewBooking.services[0]?.serviceId;
    if (!targetServiceId) {
      alert("Không tìm thấy dịch vụ để đánh giá.");
      return;
    }
    if (!reviewComment.trim()) {
      alert("Bạn hãy viết nhận xét về trải nghiệm thực tế trước khi gửi.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      await createReviewMutation.mutateAsync({
        targetType: "SERVICE",
        targetId: targetServiceId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewBooking(null);
      alert("Cảm ơn bạn đã gửi đánh giá dịch vụ.");
    } catch (err: any) {
      alert(err.message || "Chưa thể gửi đánh giá. Bạn thử lại sau ít phút.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const renderStatusBadge = (status: BookingItem["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Chờ xác nhận
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#E7ECE0] text-[#637650] border border-[#8A9A7A]/30">
            Đã tiếp nhận & xếp lịch
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-[#244B3F] border border-teal-200 animate-pulse">
            Đang thực hiện dịch vụ
          </span>
        );
      case "READY_FOR_PICKUP":
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            Chờ khách đón thú cưng
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            Đã hoàn thành dịch vụ
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Đã hủy lịch
          </span>
        );
      default:
        return null;
    }
  };

  const renderBookingStatusBadge = (booking: BookingItem) => {
    const v2Status = booking.statusV2;
    if (!v2Status) return renderStatusBadge(booking.status);

    const statusContent: Record<
      NonNullable<BookingItem["statusV2"]>,
      { label: string; className: string }
    > = {
      BOOKED: {
        label: "Đã đặt",
        className: "bg-amber-50 text-amber-800 border-amber-200",
      },
      ARRIVED: {
        label: "Đã tiếp nhận",
        className: "bg-[#E7ECE0] text-[#637650] border-[#8A9A7A]/30",
      },
      IN_SERVICE: {
        label: "Đang chăm sóc",
        className: "bg-teal-50 text-[#244B3F] border-teal-200",
      },
      READY_FOR_PICKUP: {
        label: "Chờ khách nhận",
        className: "bg-emerald-50 text-emerald-800 border-emerald-300",
      },
      DONE: {
        label: "Hoàn tất",
        className: "bg-gray-100 text-gray-700 border-gray-200",
      },
      CANCELLED: {
        label: "Đã hủy",
        className: "bg-rose-50 text-rose-700 border-rose-200",
      },
      NO_SHOW: {
        label: "Không đến",
        className: "bg-rose-50 text-rose-700 border-rose-200",
      },
    };
    const status = statusContent[v2Status];

    return (
      <span
        className={`px-3 py-1 rounded-full text-[11px] font-bold border ${status.className}`}
      >
        {status.label}
      </span>
    );
  };

  const handleOpenReschedule = (booking: BookingItem) => {
    if (!booking.startAt) return;
    setBookingToReschedule(booking);
    setRescheduleDate(formatPetCareDateValue(new Date(booking.startAt)));
    setRescheduleTime("");
    setRescheduleError(null);
    setRescheduleSuccessMessage(null);
  };

  const handleConfirmReschedule = async () => {
    if (!bookingToReschedule || !rescheduleDate || !rescheduleTime) return;
    setRescheduleError(null);

    try {
      await rescheduleBookingMutation.mutateAsync({
        id: bookingToReschedule.id,
        newStartAt: buildPetCareStartAt(rescheduleDate, rescheduleTime),
        reason: "Khách tự đổi lịch",
      });
      setRescheduleSuccessMessage(
        `Đã đổi lịch ${bookingToReschedule.code} sang ${rescheduleDate} lúc ${rescheduleTime}.`,
      );
      setBookingToReschedule(null);
      setRescheduleTime("");
    } catch (error) {
      setRescheduleError(
        error instanceof Error
          ? error.message
          : "Chưa thể đổi lịch. Vui lòng thử lại.",
      );
    }
  };

  const handleProfileTabChange = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/tai-khoan?${params.toString()}`, { scroll: false });
  };

  return (
    <CustomerSiteFrame>
      <main className="flex-1 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="account-page-heading">
            <p className="customer-page-intro__eyebrow">Tài khoản PetCare</p>
            <h1>
              {user?.name
                ? `Chào ${user.name.split(" ")[0]},`
                : "Hồ sơ của bạn và bé"}
            </h1>
            <p>
              Lịch hẹn, hồ sơ thú cưng, đơn hàng và voucher của bạn ở cùng một
              nơi.
            </p>
          </header>
          {/* If NOT Authenticated */}
          {!isAuthenticated ? (
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#DEDAD0] text-center max-w-lg mx-auto shadow-xs space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#E5ECE3] flex items-center justify-center mx-auto text-[#244B3F]">
                <User className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-[#253B33]">
                  Bạn chưa đăng nhập
                </h1>
                <p className="text-sm text-[#65716A] leading-relaxed">
                  Đăng nhập tài khoản để theo dõi tiến trình lịch hẹn, quản lý
                  hồ sơ thú cưng và đổi voucher ưu đãi từ điểm tích lũy.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/dang-nhap"
                  className="px-6 py-3 bg-[#244B3F] text-white text-xs font-bold rounded-full hover:bg-[#1B3C33] transition-colors"
                >
                  Đến trang đăng nhập
                </Link>
                <Link
                  href="/dang-ky"
                  className="px-6 py-3 bg-[#F8F5EF] hover:bg-[#E5ECE3] border border-[#DEDAD0] text-[#244B3F] text-xs font-bold rounded-xl transition-colors text-center"
                >
                  Tạo tài khoản mới
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* User Profile Header Card */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DEDAD0] shadow-xs mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <div className="w-20 h-20 rounded-full bg-[#E5ECE3] border-2 border-[#244B3F] flex items-center justify-center text-[#244B3F] font-black text-2xl uppercase overflow-hidden shrink-0">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || "Avatar"}
                        className="w-full h-full object-cover"
                      />
                    ) : user?.name ? (
                      user.name.charAt(0)
                    ) : (
                      "U"
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-2xl font-bold text-[#253B33]">
                        {user?.name}
                      </h1>
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#65716A]">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#244B3F]" />{" "}
                        {user?.phone || "Chưa có SĐT"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#244B3F]" />{" "}
                        {user?.email}
                      </span>
                    </div>
                    <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileName(user?.name || "");
                          setProfilePhone(user?.phone || "");
                          setProfileAvatarUrl(user?.avatarUrl || "");
                          setProfileError(null);
                          setIsEditProfileOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] hover:bg-[#E5ECE3] hover:border-[#244B3F] text-xs font-semibold text-[#244B3F] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa hồ sơ
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Points Stat Box & Logout */}
                <div className="flex items-center gap-4">
                  <div className="bg-[#F8F5EF] p-5 px-7 rounded-2xl border border-[#DEDAD0] text-center shrink-0">
                    <span className="text-[11px] tracking-wider text-[#65716A] font-bold">
                      Điểm tích lũy
                    </span>
                    <div className="text-3xl font-extrabold text-[#244B3F] mt-0.5 tabular-nums">
                      {user?.loyaltyPoints || 0}{" "}
                      <span className="text-xs font-bold text-[#8A9A7A]">
                        điểm
                      </span>
                    </div>
                  
                  </div>

                  <button
                    onClick={async () => {
                      await logout();
                      window.location.href = "/dang-nhap";
                    }}
                    title="Đăng xuất"
                    className="p-3 rounded-2xl border border-[#DEDAD0] hover:bg-rose-50 hover:text-rose-600 text-[#65716A] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex gap-2 border-b border-[#DEDAD0] mb-8 pb-1 overflow-x-auto">
                {[
                  {
                    id: "bookings",
                    label: `Lịch hẹn của tôi (${myBookings?.length || 0})`,
                  },
                  {
                    id: "pets",
                    label: `Hồ sơ thú cưng (${myPets?.length || 0})`,
                  },
                  {
                    id: "orders",
                    label: `Đơn hàng của tôi (${myOrders?.length || 0})`,
                  },
                  {
                    id: "points",
                    label: `Ví voucher và đổi thưởng (${myVouchers?.length || 0})`,
                  },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() =>
                        handleProfileTabChange(tab.id as ProfileTab)
                      }
                      className={`px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-[#244B3F] text-white shadow-xs"
                          : "bg-white text-[#65716A] hover:text-[#253B33] border border-transparent hover:border-[#DEDAD0]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: LỊCH HẸN */}
              {activeTab === "bookings" && (
                <div className="space-y-6">
                  {rescheduleSuccessMessage && (
                    <div
                      className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                      role="status"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">
                        {rescheduleSuccessMessage}
                      </span>
                    </div>
                  )}
                  {isBookingsLoading ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-[#DEDAD0]">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#244B3F]" />
                    </div>
                  ) : myBookings && myBookings.length > 0 ? (
                    myBookings.map((booking) => {
                      const isCancelledBooking =
                        booking.statusV2 === "CANCELLED" ||
                        booking.status === "CANCELLED";
                      const bookingPaymentMessage = getBookingPaymentMessage(
                        booking.status,
                        booking.statusV2,
                        booking.isPaid,
                      );
                      const isBooked = booking.statusV2
                        ? booking.statusV2 === "BOOKED"
                        : booking.status === "PENDING" ||
                          booking.status === "CONFIRMED";
                      const withinSelfServiceWindow =
                        !booking.startAt ||
                        canCustomerSelfServeBooking(booking.startAt);
                      const canCancel = isBooked && withinSelfServiceWindow;
                      const canReschedule =
                        booking.statusV2 === "BOOKED" &&
                        !!booking.startAt &&
                        withinSelfServiceWindow;
                      const requiresSupportForChange =
                        booking.statusV2 === "BOOKED" &&
                        !!booking.startAt &&
                        !withinSelfServiceWindow;
                      const appointmentDate = booking.startAt
                        ? formatPetCareDateValue(new Date(booking.startAt))
                        : booking.timeSlot?.slotDate
                          ? format(
                              new Date(booking.timeSlot.slotDate),
                              "dd/MM/yyyy",
                            )
                          : "Hôm nay";
                      const appointmentTime = booking.startAt
                        ? formatPetCareTimeValue(booking.startAt)
                        : booking.timeSlot?.slotTime || "Giờ hẹn";
                      const canReview =
                        booking.status === "COMPLETED" || booking.isPaid;
                      const hasReviewed = myReviews?.some(
                        (r) => r.targetId === booking.services[0]?.serviceId,
                      );

                      return (
                        <div
                          key={booking.id}
                          className="bg-white rounded-3xl border border-[#DEDAD0] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-xs transition-shadow"
                        >
                          <div className="space-y-2.5 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-base text-[#C9684D]">
                                #{booking.code}
                              </span>
                              {renderBookingStatusBadge(booking)}
                              <span className="text-[11px] text-[#65716A]">
                                Loại: Spa & Grooming
                              </span>
                            </div>

                            <h3 className="font-bold text-lg text-[#253B33]">
                              {booking.pet?.name || "Thú cưng"} (
                              {booking.pet?.weightKg || 4.5} kg •{" "}
                              {booking.pet?.breed || "Giống loài"})
                            </h3>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-[#65716A]">
                              <span className="min-w-0 break-words">
                                Khung giờ: {appointmentTime} ({appointmentDate})
                              </span>
                            </div>

                            <div className="text-xs text-[#253B33] pt-1">
                              <strong>Dịch vụ:</strong>{" "}
                              {getBookingServiceLabels(booking.services)}
                            </div>

                            {booking.discount > 0 && (
                              <div className="text-xs text-[#637650] flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5" /> Đã áp dụng giảm
                                giá voucher: -{formatVND(booking.discount)}
                              </div>
                            )}

                            {booking.staffNote && (
                              <p className="text-xs text-[#65716A] italic bg-[#F8F5EF] p-2.5 rounded-xl border border-[#DEDAD0]">
                                Ghi chú: {booking.staffNote}
                              </p>
                            )}
                          </div>

                          <div className="w-full md:w-auto text-left md:text-right pt-4 md:pt-0 border-t md:border-t-0 border-[#DEDAD0] shrink-0 space-y-3">
                            <div>
                              {isCancelledBooking ? (
                                <p
                                  className="text-sm font-semibold text-rose-700"
                                  role="status"
                                >
                                  {bookingPaymentMessage}
                                </p>
                              ) : (
                                <>
                                  <span className="text-xs text-[#65716A]">
                                    Tổng chi phí:
                                  </span>
                                  <div className="text-2xl font-black text-[#244B3F] mt-0.5 tabular-nums">
                                    {formatVND(booking.total)}
                                  </div>
                                  <div className="text-[11px] text-[#637650] mt-1 font-semibold">
                                    {bookingPaymentMessage}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Action Buttons for Booking */}
                            <div className="flex flex-wrap items-center justify-start md:justify-end gap-2">
                              {canReschedule && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReschedule(booking)}
                                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[#244B3F]/30 text-[#244B3F] bg-[#E5ECE3] hover:bg-[#E5ECE3] transition-colors"
                                >
                                  Đổi lịch
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBookingCancelReason("");
                                    setBookingToCancel(booking);
                                  }}
                                  className="px-4 py-2 rounded-xl text-xs font-bold border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                                >
                                  Hủy lịch hẹn
                                </button>
                              )}

                              {canReview && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(booking)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                                    hasReviewed
                                      ? "bg-[#F8F5EF] text-[#65716A] border border-[#DEDAD0]"
                                      : "bg-[#244B3F] text-white hover:bg-[#1B3C33]"
                                  }`}
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${hasReviewed ? "text-amber-500 fill-amber-500" : ""}`}
                                  />
                                  {hasReviewed
                                    ? "Đã đánh giá"
                                    : "Đánh giá dịch vụ"}
                                </button>
                              )}
                            </div>
                            {requiresSupportForChange && (
                              <p className="text-[11px] leading-relaxed text-[#65716A]">
                                Còn dưới 4 giờ trước lịch hẹn. Vui lòng liên hệ
                                cửa hàng để được hỗ trợ đổi hoặc hủy lịch.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-[#DEDAD0] text-center space-y-4">
                      <Calendar className="w-10 h-10 text-[#65716A] mx-auto opacity-40" />
                      <p className="text-sm text-[#65716A]">
                        Bạn chưa có lịch hẹn nào tại PetCare.
                      </p>
                      <Link
                        href="/dat-lich"
                        className="inline-block px-6 py-3 bg-[#244B3F] text-white text-xs font-bold rounded-full hover:bg-[#1B3C33] transition-colors"
                      >
                        Đặt lịch Spa
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: THÚ CƯNG CỦA TÔI */}
              {activeTab === "pets" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold text-[#253B33]">
                        Hồ sơ thú cưng đã lưu
                      </h2>
                      <p className="text-xs text-[#65716A]">
                        Lưu thông tin để đặt lịch spa nhanh chóng mà không cần
                        nhập lại.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsAddPetModalOpen(true)}
                        className="px-4 py-2.5 bg-[#244B3F] hover:bg-[#1B3C33] text-white rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Thêm thú cưng
                      </button>
                    </div>
                  </div>

                  {isPetsLoading ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-[#DEDAD0]">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#244B3F]" />
                    </div>
                  ) : myPets && myPets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {myPets.map((pet) => (
                        <div
                          key={pet.id}
                          className="bg-white rounded-3xl border border-[#DEDAD0] p-6 space-y-4 hover:shadow-xs transition-shadow flex flex-col justify-between"
                        >
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="w-14 h-14 rounded-2xl bg-[#E5ECE3] flex items-center justify-center text-base font-black text-[#244B3F] overflow-hidden shrink-0">
                                {pet.avatarUrl ? (
                                  <img
                                    src={pet.avatarUrl}
                                    alt={pet.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : pet.species === "CAT" ? (
                                  "Mèo"
                                ) : (
                                  "Chó"
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    pet.hasVaccine
                                      ? "bg-[#E7ECE0] text-[#637650] border border-[#8A9A7A]/30"
                                      : "bg-gray-100 text-gray-600 border border-gray-200"
                                  }`}
                                >
                                  {pet.hasVaccine
                                    ? "Đã tiêm phòng"
                                    : "Chưa tiêm phòng"}
                                </span>
                                {pet.behavioralFlag === "AGGRESSIVE" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Cảnh báo: Hung dữ / Cần chú ý
                                  </span>
                                )}
                                {pet.behavioralFlag === "TIMID" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Cảnh báo: Nhút nhát / Sợ tiếng ồn
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg text-[#253B33]">
                                  {pet.name}
                                </h3>
                                {pet.ageMonths != null ? (
                                  <span className="text-xs text-[#65716A] font-medium">
                                    {pet.ageMonths} tháng
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-[#65716A]">
                                {pet.species === "CAT" ? "Mèo" : "Chó"} •{" "}
                                {pet.breed} •{" "}
                                <strong className="text-[#253B33]">
                                  {pet.weightKg} kg
                                </strong>
                              </p>
                              {pet.nextSpaDate && (
                                <p className="text-[11px] text-[#244B3F] flex items-center gap-1 font-medium pt-1">
                                  <CalendarDays className="w-3.5 h-3.5" />
                                  Nhắc Spa định kỳ:{" "}
                                  {format(
                                    new Date(pet.nextSpaDate),
                                    "dd/MM/yyyy",
                                  )}
                                </p>
                              )}
                            </div>

                            {pet.notes && (
                              <p className="text-xs text-[#65716A] bg-[#F8F5EF] p-2.5 rounded-xl border border-[#DEDAD0] leading-relaxed">
                                Ghi chú: {pet.notes}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 space-y-2">
                            <Link
                              href={`/dat-lich?petId=${encodeURIComponent(pet.id)}`}
                              className="w-full py-2.5 bg-[#F8F5EF] hover:bg-[#E5ECE3] border border-[#DEDAD0] hover:border-[#244B3F] text-[#244B3F] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Scissors className="w-3.5 h-3.5" /> Đặt lịch Spa
                              Cho {pet.name}
                            </Link>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPet(pet)}
                                className="py-2 px-3 bg-white hover:bg-[#F8F5EF] border border-[#DEDAD0] hover:border-[#244B3F] text-[#244B3F] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Sửa thông tin
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPetToDelete(pet);
                                  setDeletePetError(null);
                                }}
                                className="py-2 px-3 bg-white hover:bg-rose-50 border border-[#DEDAD0] hover:border-rose-200 text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Xóa hồ sơ
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-[#DEDAD0] text-center space-y-4">
                      <p className="text-sm text-[#65716A]">
                        Bạn chưa tạo hồ sơ thú cưng nào.
                      </p>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setIsAddPetModalOpen(true)}
                          className="px-6 py-2.5 bg-[#244B3F] text-white text-xs font-bold rounded-full hover:bg-[#1B3C33] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Thêm thú cưng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ĐƠN HÀNG CỦA TÔI */}
              {activeTab === "orders" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#253B33]">
                      Đơn mua hàng của tôi
                    </h2>
                    <p className="text-xs text-[#65716A]">
                      Theo dõi tiến trình và trạng thái các đơn hàng phụ kiện,
                      thức ăn chăm sóc thú cưng.
                    </p>
                  </div>

                  {isOrdersLoading ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-[#DEDAD0]">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#244B3F]" />
                    </div>
                  ) : myOrders && myOrders.length > 0 ? (
                    <div className="space-y-4">
                      {myOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white rounded-3xl border border-[#DEDAD0] p-6 sm:p-8 space-y-4 hover:shadow-xs transition-shadow"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#DEDAD0] gap-2">
                            <div>
                              <span className="font-bold text-xs text-[#244B3F] bg-[#E5ECE3] px-2.5 py-1 rounded-lg">
                                Đơn hàng #{order.code}
                              </span>
                              <span className="text-xs text-[#65716A] ml-3">
                                {format(
                                  new Date(order.createdAt),
                                  "dd/MM/yyyy HH:mm",
                                )}
                              </span>
                            </div>
                            <div>
                              {order.status === "PENDING" && !order.isPaid && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {order.paymentExpiresAt &&
                                  new Date(order.paymentExpiresAt) <= new Date()
                                    ? "Quá hạn thanh toán"
                                    : "Chờ thanh toán"}
                                </span>
                              )}
                              {order.status === "PENDING" && order.isPaid && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  Chờ xử lý
                                </span>
                              )}
                              {order.status === "PROCESSING" && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  Đang chuẩn bị
                                </span>
                              )}
                              {order.status === "READY" && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                  {order.fulfillmentMethod === "DELIVERY"
                                    ? "Sẵn sàng giao"
                                    : "Sẵn sàng nhận tại cửa hàng"}
                                </span>
                              )}
                              {order.status === "IN_DELIVERY" && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  Đang giao
                                </span>
                              )}
                              {order.status === "DELIVERY_FAILED" && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Giao chưa thành công, PetCare sẽ liên hệ
                                </span>
                              )}
                              {order.status === "COMPLETED" && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#E7ECE0] text-[#637650] border border-[#8A9A7A]/30">
                                  Hoàn tất đơn hàng
                                </span>
                              )}
                              {order.status === "CANCELLED" && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Đã hủy đơn
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Items list */}
                          <div className="divide-y divide-[#DEDAD0]/60">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="py-3 flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-[#F8F5EF] border border-[#DEDAD0] overflow-hidden flex items-center justify-center shrink-0">
                                    {item.product?.imageUrl ? (
                                      <img
                                        src={item.product.imageUrl}
                                        alt={item.product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Package className="w-5 h-5 text-[#65716A]" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-xs text-[#253B33]">
                                      {item.product?.name || "Sản phẩm"}
                                    </h4>
                                    <span className="text-[11px] text-[#65716A]">
                                      Số lượng: {item.quantity} x{" "}
                                      {formatVND(item.priceApplied)}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-bold text-xs text-[#253B33]">
                                  {formatVND(item.priceApplied * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Order Summary & Delivery Info */}
                          <div className="pt-3 border-t border-[#DEDAD0] flex flex-col md:flex-row md:items-end justify-between gap-4 text-xs">
                            <div className="text-[#65716A] space-y-1">
                              {order.fulfillmentMethod === "DELIVERY" ? (
                                <p>
                                  <strong>Giao đến:</strong>{" "}
                                  {order.deliveryAddress}, {order.deliveryWard},{" "}
                                  {order.deliveryProvince}
                                </p>
                              ) : order.shippingAddress ? (
                                <p>
                                  <strong>Thông tin giao nhận (đơn cũ):</strong>{" "}
                                  {order.shippingAddress}
                                </p>
                              ) : (
                                <p>
                                  <strong>Hình thức nhận:</strong> Tại cửa hàng
                                </p>
                              )}
                              {order.contactPhone && (
                                <p>
                                  <strong>Người nhận:</strong>{" "}
                                  {order.contactName || "Khách hàng"} (
                                  {order.contactPhone})
                                </p>
                              )}
                              <p>
                                <strong>Phương thức:</strong>{" "}
                                {
                                  (
                                    {
                                      CASH: "Tiền mặt",
                                      BANK_TRANSFER: "Chuyển khoản QR",
                                      MOMO: "MoMo",
                                      VNPAY: "VNPay",
                                    } as const
                                  )[order.paymentMethod]
                                }{" "}
                                •{" "}
                                <span
                                  className={
                                    order.isPaid
                                      ? "text-[#637650] font-semibold"
                                      : "text-amber-700"
                                  }
                                >
                                  {order.isPaid
                                    ? "Đã thanh toán"
                                    : order.paymentMethod === "BANK_TRANSFER"
                                      ? "Chờ thanh toán"
                                      : "Chưa thanh toán"}
                                </span>
                              </p>
                            </div>

                            <div className="text-right space-y-1">
                              {order.discount > 0 && (
                                <div className="text-[#637650] flex items-center justify-end gap-1">
                                  <Tag className="w-3 h-3" /> Giảm giá voucher:
                                  -{formatVND(order.discount)}
                                </div>
                              )}
                              {order.fulfillmentMethod === "DELIVERY" && (
                                <div>
                                  Phí giao: {formatVND(order.deliveryFee ?? 0)}
                                </div>
                              )}
                              {order.pointsDiscount > 0 && (
                                <div className="text-[#244B3F] flex items-center justify-end gap-1">
                                  <Award className="w-3 h-3" /> Giảm từ điểm
                                  tích lũy ({order.pointsUsed} điểm): -
                                  {formatVND(order.pointsDiscount)}
                                </div>
                              )}
                              <div className="text-base font-extrabold text-[#244B3F]">
                                Tổng tiền: {formatVND(order.total)}
                              </div>
                            </div>
                          </div>
                          {order.source === "ONLINE" &&
                            order.status !== "CANCELLED" &&
                            !order.isPaid &&
                            order.paymentCode &&
                            (order.paymentExpiresAt &&
                            new Date(order.paymentExpiresAt) <= new Date() ? (
                              <p
                                role="status"
                                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                              >
                                Đơn sẽ tự hủy nếu chưa thanh toán đúng hạn. Nếu
                                đã chuyển khoản, vui lòng liên hệ PetCare.
                              </p>
                            ) : (
                              <div className="rounded-xl border border-[#E5ECE3] bg-[#F0EEE6] p-4 text-xs space-y-2">
                                <p className="font-bold">
                                  QR thanh toán đơn hàng
                                </p>
                                {buildVietQrImageUrl(
                                  orderQrAccount,
                                  order.total,
                                  `THANHTOAN ${order.paymentCode}`,
                                ) && (
                                  <div className="space-y-3">
                                    <img
                                      src={
                                        buildVietQrImageUrl(
                                          orderQrAccount,
                                          order.total,
                                          `THANHTOAN ${order.paymentCode}`,
                                        )!
                                      }
                                      alt={`QR thanh toán đơn ${order.code}`}
                                      className="size-44 max-w-full rounded-lg bg-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleSaveOrderQr(order)
                                      }
                                      disabled={savingQrOrderCode !== null}
                                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#244B3F] px-4 py-2 font-bold text-[#244B3F] disabled:opacity-60"
                                    >
                                      {savingQrOrderCode === order.code ? (
                                        <Loader2
                                          className="size-4 animate-spin"
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <Download
                                          className="size-4"
                                          aria-hidden="true"
                                        />
                                      )}
                                      Lưu mã QR
                                    </button>
                                  </div>
                                )}
                                <p className="break-all">
                                  Nội dung:{" "}
                                  <strong>THANHTOAN {order.paymentCode}</strong>
                                </p>
                                <p>
                                  Đơn tự hủy nếu chưa thanh toán trước{" "}
                                  {new Date(
                                    order.paymentExpiresAt!,
                                  ).toLocaleString("vi-VN")}
                                  .
                                </p>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-[#DEDAD0] text-center space-y-4">
                      <ShoppingBag className="w-10 h-10 text-[#65716A] mx-auto opacity-40" />
                      <p className="text-sm text-[#65716A]">
                        Bạn chưa có đơn đặt mua sản phẩm nào.
                      </p>
                      <Link
                        href="/san-pham"
                        className="inline-block px-6 py-3 bg-[#244B3F] text-white text-xs font-bold rounded-full hover:bg-[#1B3C33] transition-colors"
                      >
                        Xem cửa hàng PetCare
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: VÍ VOUCHER & ĐỔI ĐIỂM TÍCH LŨY */}
              {activeTab === "points" && (
                <div className="space-y-10">
                  {/* Points Banner Card */}
                  <div className="bg-white rounded-3xl border border-[#DEDAD0] p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DEDAD0]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#E5ECE3] flex items-center justify-center text-[#244B3F]">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-[#253B33]">
                            Điểm tích lũy và đổi voucher
                          </h2>
                          <p className="text-xs text-[#65716A]">
                            Mỗi 10.000đ thực thu sau giảm giá được cộng 1 điểm
                            tích lũy. Điểm chỉ dùng để đổi voucher.
                          </p>
                        </div>
                      </div>
                      <div className="bg-[#E7ECE0] px-4 py-2 rounded-xl border border-[#8A9A7A]/30 text-xs font-bold text-[#637650] self-start sm:self-auto">
                        Số dư: {user?.loyaltyPoints || 0} điểm
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#DEDAD0] bg-[#F8F5EF] p-5 space-y-2">
                      <h3 className="text-sm font-bold text-[#253B33]">
                        Dùng điểm để đổi voucher
                      </h3>
                      <p className="text-xs text-[#65716A] leading-relaxed">
                        Chọn voucher trong gian hàng đổi thưởng. Sau khi đổi,
                        nhập mã voucher khi thanh toán và áp dụng theo điều kiện
                        ghi trên voucher. Điểm không được quy đổi trực tiếp
                        thành tiền hoặc giảm thẳng vào hóa đơn.
                      </p>
                    </div>

                    {redeemSuccessMsg && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />{" "}
                        {redeemSuccessMsg}
                      </div>
                    )}
                  </div>

                  {/* Section 1: REWARD STORE (Gian hàng đổi voucher) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-[#253B33] flex items-center gap-2">
                        <Gift className="w-4 h-4 text-[#244B3F]" /> Gian hàng
                        đổi voucher bằng điểm tích lũy
                      </h3>
                    </div>

                    {isRewardsLoading ? (
                      <div className="p-8 text-center bg-white rounded-3xl border border-[#DEDAD0]">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#244B3F]" />
                      </div>
                    ) : rewardVouchers && rewardVouchers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {rewardVouchers.map((voucher) => {
                          const canAfford =
                            (user?.loyaltyPoints || 0) >=
                            (voucher.pointCost || 0);
                          const isRedeeming = redeemVoucherMutation.isPending;

                          return (
                            <div
                              key={voucher.id}
                              className="bg-white rounded-2xl border border-[#DEDAD0] p-4 flex flex-col justify-between space-y-3 hover:border-[#244B3F] transition-colors relative overflow-hidden"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs font-black text-[#244B3F] bg-[#E5ECE3] px-2 py-0.5 rounded">
                                    {voucher.code}
                                  </span>
                                  <span className="text-xs font-bold text-[#C9684D]">
                                    {voucher.pointCost} điểm
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm text-[#253B33] line-clamp-2">
                                  {formatLoyaltyCopy(voucher.title)}
                                </h4>
                              </div>

                              <div className="pt-2 border-t border-[#F0EEE6] space-y-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedVoucherDetail(voucher)
                                  }
                                  className="w-full text-center text-xs font-semibold text-[#244B3F] hover:underline"
                                >
                                  Chi tiết điều kiện
                                </button>
                                <button
                                  type="button"
                                  disabled={!canAfford || isRedeeming}
                                  onClick={() =>
                                    handleRedeemVoucher(voucher.code)
                                  }
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                    canAfford
                                      ? "bg-[#244B3F] hover:bg-[#1B3C33] text-white"
                                      : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                  }`}
                                >
                                  {canAfford
                                    ? `Đổi voucher (${voucher.pointCost} điểm)`
                                    : `Cần thêm ${(voucher.pointCost || 0) - (user?.loyaltyPoints || 0)} điểm`}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-white p-8 rounded-3xl border border-[#DEDAD0] text-center text-xs text-[#65716A]">
                        Hiện chưa có voucher đổi thưởng nào đang mở.
                      </div>
                    )}
                  </div>

                  {/* Section 2: MY VOUCHER WALLET (Ví voucher của tôi) */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-[#253B33] flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-[#244B3F]" /> Ví voucher
                        của tôi ({myVouchers?.length || 0})
                      </h3>
                    </div>

                    {isVouchersLoading ? (
                      <div className="p-8 text-center bg-white rounded-3xl border border-[#DEDAD0]">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#244B3F]" />
                      </div>
                    ) : myVouchers && myVouchers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myVouchers.map((v) => (
                          <div
                            key={v.id}
                            className="bg-white rounded-2xl border border-[#DEDAD0] p-4.5 flex flex-col justify-between space-y-3.5 hover:border-[#244B3F] transition-colors relative"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-black text-[#244B3F] bg-[#E5ECE3] px-2.5 py-1 rounded-md">
                                  {v.code}
                                </span>
                                <span className="text-[11px] font-extrabold text-[#637650] bg-[#E7ECE0] px-2 py-0.5 rounded-full">
                                  Khả dụng
                                </span>
                              </div>

                              <h4 className="font-bold text-sm text-[#253B33] line-clamp-2">
                                {formatLoyaltyCopy(v.title)}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-[#F0EEE6]">
                              <button
                                type="button"
                                onClick={() => handleCopyCode(v.code)}
                                className="flex-1 py-2 bg-[#F8F5EF] hover:bg-slate-100 border border-[#DEDAD0] text-[#253B33] rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                              >
                                {copiedCode === v.code ? (
                                  <span className="text-emerald-600 font-bold">
                                    Đã chép
                                  </span>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-[#65716A]" />{" "}
                                    Sao chép
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedVoucherDetail(v)}
                                className="flex-1 py-2 bg-[#F8F5EF] hover:bg-[#E5ECE3] border border-[#DEDAD0] text-[#244B3F] rounded-xl text-xs font-bold transition-colors text-center"
                              >
                                Chi tiết
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white p-8 rounded-3xl border border-[#DEDAD0] text-center text-xs text-[#65716A]">
                        Ví của bạn chưa có mã voucher nào.
                      </div>
                    )}
                  </div>

                  <LoyaltyHistoryCard
                    transactions={loyaltyHistory}
                    isLoading={isLoyaltyHistoryLoading}
                    isError={isLoyaltyHistoryError}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* MODAL CHI TIẾT VOUCHER */}
      {selectedVoucherDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-[#DEDAD0] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#DEDAD0] flex justify-between items-center bg-[#F8F5EF]">
              <div>
                <h3 className="font-bold text-[#253B33] text-base">
                  Chi tiết voucher
                </h3>
                <span className="text-xs text-[#65716A]">
                  Thông tin và điều kiện sử dụng
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucherDetail(null)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Voucher Highlight Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#E5ECE3] to-[#F8F5EF] border border-[#244B3F]/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-[#244B3F] tracking-wider">
                    {selectedVoucherDetail.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedVoucherDetail.code)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#244B3F]/30 rounded-lg text-xs font-bold text-[#244B3F] flex items-center gap-1 shadow-2xs"
                  >
                    {copiedCode === selectedVoucherDetail.code ? (
                      <span className="text-emerald-600">Đã sao chép</span>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Sao chép mã
                      </>
                    )}
                  </button>
                </div>
                <h4 className="font-bold text-sm text-[#253B33]">
                  {formatLoyaltyCopy(selectedVoucherDetail.title)}
                </h4>
                {selectedVoucherDetail.description && (
                  <p className="text-[#65716A] leading-relaxed">
                    {formatLoyaltyCopy(selectedVoucherDetail.description)}
                  </p>
                )}
              </div>

              {/* Chi tiết điều kiện áp dụng */}
              <div className="space-y-2.5">
                <h5 className="font-bold text-[#253B33] text-xs tracking-wider text-[#65716A]">
                  Điều kiện áp dụng
                </h5>

                <div className="space-y-2 bg-[#F8F5EF] p-3.5 rounded-2xl border border-[#DEDAD0]">
                  <div className="flex justify-between items-center py-1 border-b border-[#DEDAD0]/60">
                    <span className="text-[#65716A]">Mức giảm giá:</span>
                    <span className="font-bold text-[#C9684D]">
                      {selectedVoucherDetail.discountType === "PERCENTAGE"
                        ? `Giảm ${selectedVoucherDetail.discountValue}%`
                        : formatVND(selectedVoucherDetail.discountValue)}
                    </span>
                  </div>

                  {selectedVoucherDetail.maxDiscount && (
                    <div className="flex justify-between items-center py-1 border-b border-[#DEDAD0]/60">
                      <span className="text-[#65716A]">Giảm tối đa:</span>
                      <span className="font-semibold text-[#253B33]">
                        {formatVND(selectedVoucherDetail.maxDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-1 border-b border-[#DEDAD0]/60">
                    <span className="text-[#65716A]">Đơn hàng tối thiểu:</span>
                    <span className="font-semibold text-[#253B33]">
                      {formatVND(selectedVoucherDetail.minSpend || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#65716A]">Hạn sử dụng:</span>
                    <span className="font-semibold text-[#253B33]">
                      {selectedVoucherDetail.expiryDate
                        ? format(
                            new Date(selectedVoucherDetail.expiryDate),
                            "dd/MM/yyyy",
                          )
                        : "Vô thời hạn"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hướng dẫn áp dụng */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 space-y-1 text-[#637650]">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />{" "}
                  Cách sử dụng voucher:
                </div>
                <p className="text-[11px] leading-relaxed text-[#637650]/90">
                  • Nhập mã này tại bước thanh toán khi mua hàng trực tuyến trên
                  website.
                  <br />• Hoặc xuất trình mã này cho nhân viên thu ngân khi
                  thanh toán dịch vụ tại quầy.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedVoucherDetail(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#DEDAD0] text-[#65716A] hover:bg-gray-50 text-xs font-bold"
                >
                  Đóng
                </button>
                <Link
                  href="/cua-hang"
                  onClick={() => setSelectedVoucherDetail(null)}
                  className="flex-1 py-2.5 bg-[#244B3F] hover:bg-[#1B3C33] text-white rounded-full text-xs font-bold flex items-center justify-center gap-1"
                >
                  Mua sắm ngay <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM THÚ CƯNG MỚI */}
      {isAddPetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-3 backdrop-blur-xs sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-pet-title"
            className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-[#DEDAD0] bg-[#FFFDF8] shadow-[0_24px_72px_rgba(27,60,51,0.20)] animate-in fade-in zoom-in-95"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#DEDAD0] bg-[#F8F5EF] p-5 sm:p-6">
              <div>
                <h3 id="add-pet-title" className="font-semibold text-[#253B33] text-xl tracking-tight">
                  Thêm hồ sơ thú cưng
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#65716A]">
                  Lưu thông tin để đặt lịch nhanh chóng cho lần sau
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPetModalOpen(false)}
                aria-label="Đóng form thêm hồ sơ thú cưng"
                className="shrink-0 rounded-full p-2 text-[#65716A] transition-colors hover:bg-white hover:text-[#253B33]"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePet} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-white p-4 text-sm sm:p-6">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#253B33]">
                    Tên (Chó / Mèo) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Milo, Bơ, Lu..."
                    value={newPetName}
                    onChange={(e) => setNewPetName(e.target.value)}
                    className="w-full rounded-xl border border-[#D5DFDA] bg-[#FBFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#244B3F] focus:bg-white focus:ring-2 focus:ring-[#244B3F]/10"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#253B33]">Loài</label>
                    <select
                      value={newPetSpecies}
                      onChange={(e) =>
                        setNewPetSpecies(e.target.value as "DOG" | "CAT")
                      }
                      className="w-full rounded-xl border border-[#D5DFDA] bg-[#FBFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#244B3F] focus:bg-white focus:ring-2 focus:ring-[#244B3F]/10"
                    >
                      <option value="DOG">Chó</option>
                      <option value="CAT">Mèo</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#253B33]">Giống</label>
                    <input
                      type="text"
                      placeholder="Poodle, Corgi, Mèo Anh lông ngắn..."
                      value={newPetBreed}
                      onChange={(e) => setNewPetBreed(e.target.value)}
                      className="w-full rounded-xl border border-[#D5DFDA] bg-[#FBFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#244B3F] focus:bg-white focus:ring-2 focus:ring-[#244B3F]/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#253B33]">
                      Cân nặng (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newPetWeight}
                      onChange={(e) => setNewPetWeight(e.target.value)}
                      className="w-full rounded-xl border border-[#D5DFDA] bg-[#FBFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#244B3F] focus:bg-white focus:ring-2 focus:ring-[#244B3F]/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#253B33]">
                      Tuổi (tháng)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ví dụ: 12"
                      value={newPetAgeMonths}
                      onChange={(e) => setNewPetAgeMonths(e.target.value)}
                      className="w-full rounded-xl border border-[#D5DFDA] bg-[#FBFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#244B3F] focus:bg-white focus:ring-2 focus:ring-[#244B3F]/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <label className="font-semibold text-[#253B33]">
                      Ảnh đại diện
                    </label>
                    <span className="text-xs text-[#7A847D]">Không bắt buộc</span>
                  </div>
                  <input
                    type="file"
                    ref={petAvatarInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Chọn ảnh đại diện thú cưng"
                    onChange={(e) => {
                      void handlePetAvatarFileChange(e, false);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                  />
                  {(petAvatarPreview.previewUrl || newPetAvatarUrl) ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-[#D5DFDA] bg-[#FBFAF7] p-3 sm:flex-row sm:items-center">
                      <img
                        src={petAvatarPreview.previewUrl || newPetAvatarUrl}
                        alt="Xem trước ảnh thú cưng"
                        className="h-40 w-full rounded-xl bg-[#E9EEE9] object-cover sm:size-24"
                      />
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                        <p className="text-sm font-medium text-[#253B33]">
                          {isUploadingPetAvatar
                            ? "Đang tải ảnh lên..."
                            : "Ảnh đã sẵn sàng cho hồ sơ"}
                        </p>
                        <p className="text-xs leading-relaxed text-[#65716A]">
                          JPG, PNG hoặc WebP · tối đa 5 MB
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => petAvatarInputRef.current?.click()}
                            disabled={isUploadingPetAvatar}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#244B3F]/25 bg-white px-4 py-2 text-sm font-semibold text-[#244B3F] transition hover:border-[#244B3F] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUploadingPetAvatar ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Upload className="size-4" aria-hidden="true" />
                            )}
                            {isUploadingPetAvatar ? "Đang tải" : "Thay ảnh"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewPetAvatarUrl("");
                              setPetAvatarError(null);
                              petAvatarPreview.clearPreview();
                            }}
                            disabled={isUploadingPetAvatar}
                            className="inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-[#65716A] transition hover:bg-white hover:text-[#253B33] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Bỏ ảnh
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => petAvatarInputRef.current?.click()}
                      disabled={isUploadingPetAvatar}
                      className="flex min-h-28 w-full items-center gap-4 rounded-2xl border border-dashed border-[#BFCFC7] bg-[#FBFAF7] p-4 text-left transition hover:border-[#244B3F] hover:bg-[#F5F8F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#244B3F] disabled:cursor-not-allowed disabled:opacity-60 sm:p-5"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#E9F0EA] text-[#244B3F]">
                        {isUploadingPetAvatar ? (
                          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Upload className="size-5" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#253B33]">
                          {isUploadingPetAvatar
                            ? "Đang tải ảnh lên..."
                            : "Chọn ảnh từ thiết bị"}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-[#65716A]">
                          JPG, PNG hoặc WebP · tối đa 5 MB
                        </span>
                      </span>
                    </button>
                  )}
                  {petAvatarError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm leading-relaxed text-rose-700"
                    >
                      {petAvatarError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#253B33]">
                    Đặc tính an toàn
                  </label>
                  <select
                    value={newPetBehavioralFlag}
                    onChange={(e) =>
                      setNewPetBehavioralFlag(
                        e.target.value as "NORMAL" | "AGGRESSIVE" | "TIMID",
                      )
                    }
                    className="w-full rounded-xl border border-[#D5DFDA] bg-[#FBFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#244B3F] focus:bg-white focus:ring-2 focus:ring-[#244B3F]/10"
                  >
                    <option value="NORMAL">Bình thường / Thân thiện</option>
                    <option value="TIMID">Nhút nhát / Sợ tiếng sấy</option>
                    <option value="AGGRESSIVE">Hung dữ / Cần rọ mõm</option>
                  </select>
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="newPetVaccine"
                    checked={newPetHasVaccine}
                    onChange={(e) => setNewPetHasVaccine(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 rounded text-[#244B3F] focus:ring-[#244B3F]"
                  />
                  <label
                    htmlFor="newPetVaccine"
                    className="text-sm font-medium leading-relaxed text-[#253B33]"
                  >
                    Đã được tiêm phòng vắc-xin đầy đủ
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#253B33]">
                    Ghi chú sức khỏe / tính cách
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Da nhạy cảm, nhát tiếng máy sấy, thân thiện..."
                    value={newPetNotes}
                    onChange={(e) => setNewPetNotes(e.target.value)}
                    className="w-full resize-y rounded-xl border border-[#D5DFDA] bg-[#FBFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#244B3F] focus:bg-white focus:ring-2 focus:ring-[#244B3F]/10"
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#DEDAD0] bg-[#FFFDF8] p-4 sm:flex-row sm:justify-end sm:p-5">
                <button
                  type="button"
                  onClick={() => setIsAddPetModalOpen(false)}
                  className="min-h-11 w-full rounded-full border border-[#DEDAD0] px-5 py-2.5 text-sm font-semibold text-[#65716A] transition hover:bg-[#F8F5EF] sm:w-auto"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPet || isUploadingPetAvatar}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#244B3F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1B3C33] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSubmittingPet ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    "Lưu hồ sơ"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI LỊCH HẸN */}
      {bookingToReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-title"
            className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#DEDAD0] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#DEDAD0] bg-[#F8F5EF] p-4 sm:p-5">
              <div className="min-w-0">
                <h3
                  id="reschedule-title"
                  className="break-words font-bold text-[#253B33]"
                >
                  Đổi lịch hẹn #{bookingToReschedule.code}
                </h3>
                <p className="mt-1 text-xs text-[#65716A]">
                  Chọn ngày và một khung giờ còn chỗ cho{" "}
                  {bookingToReschedule.pet?.name || "thú cưng"}.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng cửa sổ đổi lịch"
                onClick={() => setBookingToReschedule(null)}
                className="shrink-0 rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 space-y-5 overflow-y-auto p-4 sm:p-6">
              <div className="rounded-2xl border border-[#DEDAD0] bg-[#F8F5EF] p-3 text-xs leading-relaxed text-[#65716A]">
                Lịch hiện tại:{" "}
                <strong className="text-[#253B33]">
                  {originalBookingDate} lúc {originalBookingTime}
                </strong>
                . Có thể tự đổi trước giờ hẹn ít nhất 4 giờ. Khung giờ được xác
                nhận khi lưu thành công.
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="reschedule-date"
                  className="text-xs font-bold text-[#253B33]"
                >
                  Ngày mới
                </label>
                <input
                  id="reschedule-date"
                  type="date"
                  min={todayPetCareDate}
                  value={rescheduleDate}
                  onChange={(event) => {
                    setRescheduleDate(event.target.value);
                    setRescheduleTime("");
                    setRescheduleError(null);
                  }}
                  className="w-full rounded-xl border border-[#DEDAD0] bg-white px-3.5 py-3 text-sm text-[#253B33] outline-none focus:border-[#244B3F]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-[#253B33]">
                    Khung giờ còn chỗ
                  </h4>
                  {rescheduleDate && (
                    <span className="text-[11px] text-[#65716A]">
                      Giờ Việt Nam
                    </span>
                  )}
                </div>

                {!rescheduleDate ? (
                  <p className="rounded-xl bg-[#F8F5EF] p-3 text-xs text-[#65716A]">
                    Chọn ngày để xem giờ còn trống.
                  </p>
                ) : isRescheduleSlotsLoading ? (
                  <div className="flex items-center gap-2 rounded-xl bg-[#F8F5EF] p-3 text-xs text-[#65716A]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#244B3F]" />{" "}
                    Đang kiểm tra chỗ trống...
                  </div>
                ) : isRescheduleSlotsError ? (
                  <p
                    className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
                    role="alert"
                  >
                    Chưa tải được khung giờ. Vui lòng thử lại sau.
                  </p>
                ) : availableRescheduleSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availableRescheduleSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        aria-pressed={rescheduleTime === slot.time}
                        onClick={() => {
                          setRescheduleTime(slot.time);
                          setRescheduleError(null);
                        }}
                        className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-bold transition-colors ${
                          rescheduleTime === slot.time
                            ? "border-[#244B3F] bg-[#244B3F] text-white"
                            : "border-[#DEDAD0] bg-white text-[#253B33] hover:border-[#244B3F] hover:bg-[#E5ECE3]"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-[#F8F5EF] p-3 text-xs leading-relaxed text-[#65716A]">
                    Ngày này không còn khung giờ phù hợp. Hãy chọn ngày khác.
                  </p>
                )}
              </div>

              {rescheduleError && (
                <p
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700"
                  role="alert"
                >
                  {rescheduleError}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#DEDAD0] bg-white p-4 sm:flex-row sm:justify-end sm:p-5">
              <button
                type="button"
                onClick={() => setBookingToReschedule(null)}
                className="rounded-xl border border-[#DEDAD0] px-4 py-2.5 text-xs font-bold text-[#65716A] transition-colors hover:bg-gray-50"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={
                  !rescheduleTime || rescheduleBookingMutation.isPending
                }
                className="flex items-center justify-center gap-2 rounded-full bg-[#244B3F] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1B3C33] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rescheduleBookingMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Xác nhận đổi lịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN HỦY LỊCH HẸN */}
      {bookingToCancel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-[#DEDAD0] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-[#253B33]">
                Hủy lịch hẹn #{bookingToCancel.code}?
              </h3>
              <p className="text-xs text-[#65716A] leading-relaxed">
                Bạn có chắc chắn muốn hủy lịch hẹn cho thú cưng{" "}
                <strong>{bookingToCancel.pet?.name}</strong> vào ngày{" "}
                {bookingToCancel.startAt
                  ? `${formatPetCareDateValue(new Date(bookingToCancel.startAt))} lúc ${formatPetCareTimeValue(bookingToCancel.startAt)}`
                  : bookingToCancel.timeSlot?.slotDate
                    ? format(
                        new Date(bookingToCancel.timeSlot.slotDate),
                        "dd/MM/yyyy",
                      )
                    : "hôm nay"}{" "}
                không?
              </p>
            </div>

            <div className="p-3 bg-[#F8F5EF] rounded-xl border border-[#DEDAD0] text-[11px] text-[#65716A]">
              Khung giờ hẹn sẽ được tự động giải phóng để tiếp nhận khách hàng
              khác. Bạn có thể đặt lại lịch bất cứ lúc nào.
            </div>

            <div className="space-y-1.5 text-left">
              <label htmlFor="booking-cancel-reason" className="block text-sm font-semibold text-[#253B33]">
                Lý do hủy <span className="font-normal text-[#65716A]">(không bắt buộc)</span>
              </label>
              <textarea
                id="booking-cancel-reason"
                value={bookingCancelReason}
                onChange={(event) => setBookingCancelReason(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Ví dụ: Tôi cần đổi sang ngày khác."
                className="w-full resize-y rounded-xl border border-[#DEDAD0] bg-white px-3.5 py-3 text-sm text-[#253B33] outline-none transition placeholder:text-[#87928C] focus:border-[#244B3F] focus:ring-2 focus:ring-[#244B3F]/10"
              />
              <p className="text-xs text-[#65716A]">Giúp PetCare tra cứu và hỗ trợ bạn chính xác hơn.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBookingToCancel(null);
                  setBookingCancelReason("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-[#DEDAD0] text-[#65716A] hover:bg-gray-50 text-xs font-bold"
              >
                Giữ lịch hẹn
              </button>
              <button
                type="button"
                disabled={isCancellingBooking}
                onClick={handleConfirmCancelBooking}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                {isCancellingBooking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Xác nhận hủy"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐÁNH GIÁ DỊCH VỤ */}
      {reviewBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-[#DEDAD0] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#DEDAD0] flex justify-between items-center bg-[#F8F5EF]">
              <div>
                <h3 className="font-bold text-[#253B33] text-base">
                  Đánh giá dịch vụ Spa
                </h3>
                <p className="text-xs text-[#65716A]">
                  Lịch hẹn #{reviewBooking.code} • {reviewBooking.pet?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitReview}
              className="p-6 space-y-5 text-xs"
            >
              {/* Star Rating Selector */}
              <div className="text-center space-y-2">
                <span className="text-xs text-[#65716A] font-medium">
                  Bạn cảm thấy dịch vụ thế nào?
                </span>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled =
                      (reviewHoverRating || reviewRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setReviewHoverRating(star)}
                        onMouseLeave={() => setReviewHoverRating(0)}
                        onClick={() => setReviewRating(star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            isFilled
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-bold text-[#244B3F]">
                  {reviewRating === 5 && "Tuyệt vời (5/5)"}
                  {reviewRating === 4 && "Rất hài lòng (4/5)"}
                  {reviewRating === 3 && "Hài lòng (3/5)"}
                  {reviewRating === 2 && "Cần cải thiện (2/5)"}
                  {reviewRating === 1 && "Chưa hài lòng (1/5)"}
                </div>
              </div>

              {/* Review Comment */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#253B33]">
                  Nhận xét chi tiết
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Chia sẻ điều bạn hài lòng hoặc điểm PetCare cần cải thiện..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs resize-none"
                />
              </div>

              {/* Quick Tags */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-[#65716A] block">
                  Gợi ý đánh giá nhanh:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Kỹ thuật viên nhẹ nhàng",
                    "Cắt tỉa đúng kiểu đã trao đổi",
                    "Đúng giờ",
                    "Thú cưng sạch và thoải mái",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setReviewComment((prev) =>
                          prev ? `${prev}, ${tag.toLowerCase()}` : tag,
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-[#F8F5EF] hover:bg-[#E5ECE3] border border-[#DEDAD0] text-[11px] text-[#244B3F] transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewBooking(null)}
                  className="px-4 py-2 rounded-xl border border-[#DEDAD0] text-[#65716A] hover:bg-gray-50 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2 bg-[#244B3F] hover:bg-[#1B3C33] text-white rounded-full font-bold flex items-center gap-1.5"
                >
                  {isSubmittingReview ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Gửi đánh giá"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA THÔNG TIN CÁ NHÂN */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-[#DEDAD0] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#DEDAD0] flex justify-between items-center bg-[#F8F5EF]">
              <div>
                <h3 className="font-bold text-[#253B33] text-base">
                  Chỉnh sửa hồ sơ cá nhân
                </h3>
                <p className="text-xs text-[#65716A]">
                  Cập nhật họ tên, số điện thoại và ảnh đại diện
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateProfile}
              className="p-6 space-y-4 text-xs"
            >
              {profileError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-[#253B33]">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#253B33]">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  placeholder="0912345678"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs"
                />
                <span className="text-[10px] text-[#65716A]">
                  Dùng để tra cứu điểm tích lũy và xác nhận lịch hẹn tại quầy
                </span>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-[#253B33] block">
                  Ảnh đại diện
                </label>

                {/* Avatar Preview & Upload Button */}
                <div className="flex items-center gap-4 p-3 bg-[#F8F5EF] rounded-2xl border border-[#DEDAD0]">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-xs shrink-0 flex items-center justify-center text-gray-500 font-bold text-lg">
                    {profileAvatarPreview.previewUrl || profileAvatarUrl ? (
                      <img
                        src={
                          profileAvatarPreview.previewUrl || profileAvatarUrl
                        }
                        alt="Ảnh đại diện xem trước"
                        className="w-full h-full object-cover"
                      />
                    ) : profileName ? (
                      profileName.charAt(0)
                    ) : (
                      "U"
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      ref={avatarInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        void handleAvatarFileChange(e);
                        e.currentTarget.value = "";
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#DEDAD0] hover:border-[#244B3F] hover:text-[#244B3F] text-xs font-bold text-[#253B33] shadow-2xs transition-all active:scale-[0.98] disabled:opacity-60"
                    >
                      {isUploadingAvatar ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#244B3F]" />
                          <span>Đang tải ảnh...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5 text-[#244B3F]" />
                          <span>Tải ảnh từ máy</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-[#65716A]">
                      Hỗ trợ JPG, PNG, WEBP tối đa 5MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DEDAD0] text-[#65716A] hover:bg-gray-50 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProfile || isUploadingAvatar}
                  className="px-5 py-2 bg-[#244B3F] hover:bg-[#1B3C33] text-white rounded-full font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Lưu thay đổi"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA HỒ SƠ THÚ CƯNG */}
      {petToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-3 backdrop-blur-xs sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-pet-title"
            className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-[#DEDAD0] bg-[#FFFDF8] shadow-[0_24px_72px_rgba(27,60,51,0.20)] animate-in fade-in zoom-in-95"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#DEDAD0] bg-[#F8F5EF] p-5 sm:p-6">
              <div className="min-w-0">
                <h3 id="edit-pet-title" className="break-words font-semibold text-[#253B33] text-lg tracking-tight sm:text-xl">
                  Chỉnh sửa hồ sơ: {petToEdit.name}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#65716A]">
                  Cập nhật thông tin sức khỏe, cân nặng và đặc tính an toàn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPetToEdit(null)}
                aria-label="Đóng form chỉnh sửa hồ sơ thú cưng"
                className="shrink-0 rounded-full p-2 text-[#65716A] transition-colors hover:bg-white hover:text-[#253B33]"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={handleUpdatePet}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-white p-4 text-sm sm:p-6">
              {editPetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editPetError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-[#253B33]">
                  Tên (Chó / Mèo) *
                </label>
                <input
                  type="text"
                  required
                  value={editPetName}
                  onChange={(e) => setEditPetName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#253B33]">Loài</label>
                  <select
                    value={editPetSpecies}
                    onChange={(e) =>
                      setEditPetSpecies(e.target.value as "DOG" | "CAT")
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs"
                  >
                    <option value="DOG">Chó</option>
                    <option value="CAT">Mèo</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#253B33]">Giống</label>
                  <input
                    type="text"
                    value={editPetBreed}
                    onChange={(e) => setEditPetBreed(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#253B33]">
                    Cân nặng (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editPetWeight}
                    onChange={(e) => setEditPetWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#253B33]">
                    Tuổi (tháng)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 12"
                    value={editPetAgeMonths}
                    onChange={(e) => setEditPetAgeMonths(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label className="font-semibold text-[#253B33]">
                    Ảnh đại diện
                  </label>
                  <span className="text-xs text-[#7A847D]">Không bắt buộc</span>
                </div>
                <input
                  type="file"
                  ref={editPetAvatarInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Chọn ảnh đại diện thú cưng"
                  onChange={(e) => {
                    void handlePetAvatarFileChange(e, true);
                    e.currentTarget.value = "";
                  }}
                  className="hidden"
                />
                {(petAvatarPreview.previewUrl || editPetAvatarUrl) ? (
                  <div className="flex flex-col gap-3 rounded-2xl border border-[#D5DFDA] bg-[#FBFAF7] p-3 sm:flex-row sm:items-center">
                    <img
                      src={petAvatarPreview.previewUrl || editPetAvatarUrl}
                      alt="Ảnh đại diện thú cưng"
                      className="h-40 w-full rounded-xl bg-[#E9EEE9] object-cover sm:size-24"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                      <p className="text-sm font-medium text-[#253B33]">
                        {isUploadingPetAvatar
                          ? "Đang tải ảnh lên..."
                          : "Ảnh đại diện hiện tại"}
                      </p>
                      <p className="text-xs leading-relaxed text-[#65716A]">
                        JPG, PNG hoặc WebP · tối đa 5 MB
                      </p>
                      <button
                        type="button"
                        onClick={() => editPetAvatarInputRef.current?.click()}
                        disabled={isUploadingPetAvatar}
                        className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-full border border-[#244B3F]/25 bg-white px-4 py-2 text-sm font-semibold text-[#244B3F] transition hover:border-[#244B3F] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUploadingPetAvatar ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Upload className="size-4" aria-hidden="true" />
                        )}
                        {isUploadingPetAvatar ? "Đang tải" : "Thay ảnh"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editPetAvatarInputRef.current?.click()}
                    disabled={isUploadingPetAvatar}
                    className="flex min-h-28 w-full items-center gap-4 rounded-2xl border border-dashed border-[#BFCFC7] bg-[#FBFAF7] p-4 text-left transition hover:border-[#244B3F] hover:bg-[#F5F8F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#244B3F] disabled:cursor-not-allowed disabled:opacity-60 sm:p-5"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#E9F0EA] text-[#244B3F]">
                      {isUploadingPetAvatar ? (
                        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="size-5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#253B33]">
                        {isUploadingPetAvatar
                          ? "Đang tải ảnh lên..."
                          : "Chọn ảnh từ thiết bị"}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-[#65716A]">
                        JPG, PNG hoặc WebP · tối đa 5 MB
                      </span>
                    </span>
                  </button>
                )}
                {petAvatarError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm leading-relaxed text-rose-700"
                  >
                    {petAvatarError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#253B33]">
                  Đặc tính / Cảnh báo an toàn
                </label>
                <select
                  value={editPetBehavioralFlag}
                  onChange={(e) =>
                    setEditPetBehavioralFlag(
                      e.target.value as "NORMAL" | "AGGRESSIVE" | "TIMID",
                    )
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs"
                >
                  <option value="NORMAL">Bình thường / Thân thiện</option>
                  <option value="TIMID">
                    Nhút nhát / Dễ giật mình tiếng ồn
                  </option>
                  <option value="AGGRESSIVE">
                    Hung dữ / Cần rọ mõm / Cẩn trọng khi sấy
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editPetVaccine"
                  checked={editPetHasVaccine}
                  onChange={(e) => setEditPetHasVaccine(e.target.checked)}
                  className="w-4 h-4 rounded text-[#244B3F] focus:ring-[#244B3F]"
                />
                <label
                  htmlFor="editPetVaccine"
                  className="font-medium text-[#253B33]"
                >
                  Đã được tiêm phòng vắc-xin đầy đủ
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#253B33]">
                  Ghi chú sức khỏe & dặn dò
                </label>
                <textarea
                  rows={2}
                  value={editPetNotes}
                  onChange={(e) => setEditPetNotes(e.target.value)}
                  placeholder="Dị ứng xà phòng thơm, từng gãy chân sau, nhạy cảm vùng tai..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDAD0] bg-[#F8F5EF] focus:bg-white focus:border-[#244B3F] outline-none text-xs resize-none"
                />
              </div>

              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#DEDAD0] bg-[#FFFDF8] p-4 sm:flex-row sm:justify-end sm:p-5">
                <button
                  type="button"
                  onClick={() => setPetToEdit(null)}
                  className="min-h-11 w-full rounded-full border border-[#DEDAD0] px-5 py-2.5 text-sm font-semibold text-[#65716A] transition hover:bg-[#F8F5EF] sm:w-auto"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditPet || isUploadingPetAvatar}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#244B3F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1B3C33] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSubmittingEditPet ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    "Lưu cập nhật"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA HỒ SƠ THÚ CƯNG */}
      {petToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-[#DEDAD0] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-[#253B33]">
                Xóa Hồ Sơ {petToDelete.name}?
              </h3>
              <p className="text-xs text-[#65716A] leading-relaxed">
                Hồ sơ thông tin của <strong>{petToDelete.name}</strong> (
                {petToDelete.breed}) sẽ bị xóa vĩnh viễn khỏi tài khoản của bạn.
              </p>
            </div>

            {deletePetError && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deletePetError}</span>
              </div>
            )}

            <div className="p-3 bg-[#F8F5EF] rounded-xl border border-[#DEDAD0] text-[11px] text-[#65716A]">
              Lưu ý: Không thể xóa hồ sơ nếu đang có lịch hẹn dịch vụ chưa hoàn
              thành hoặc đang được chăm sóc tại cửa hàng.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPetToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#DEDAD0] text-[#65716A] hover:bg-gray-50 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeletingPet}
                onClick={handleConfirmDeletePet}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                {isDeletingPet ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Xóa Hồ Sơ"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Walkthrough Onboarding Modal */}
      <OnboardingWalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        redirectUrl={redirectUrlAfterWalkthrough}
        onComplete={() => {
          fetchProfile();
          setIsWalkthroughOpen(false);
        }}
      />
    </CustomerSiteFrame>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <CustomerSiteFrame>
          <main className="flex flex-1 items-center justify-center gap-3 p-12 text-sm text-[#65716A]">
            <Loader2
              className="size-6 animate-spin text-[#244B3F]"
              aria-hidden="true"
            />
            Đang mở hồ sơ của bạn...
          </main>
        </CustomerSiteFrame>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
