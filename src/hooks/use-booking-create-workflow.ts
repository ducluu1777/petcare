import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAvailableSlots, useCreateBookingV2 } from "@/hooks/use-bookings";
import { useCreatePet } from "@/hooks/use-pets";
import { useSearchUserByPhone, useUserDetail, useUsersList } from "@/hooks/use-users";
import type { UserListItem } from "@/hooks/use-users";
import { useServices } from "@/hooks/use-services";
import type { BookingCreateDialogProps } from "@/components/admin/bookings/booking-create-dialog";

type ShowToast = (text: string, type?: "success" | "error" | "info") => void;

type UseBookingCreateWorkflowOptions = {
  onCreated: () => void;
  showToast: ShowToast;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useBookingCreateWorkflow({ onCreated, showToast }: UseBookingCreateWorkflowOptions) {
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [newBookingMode, setNewBookingMode] = useState<"WALK_IN" | "APPOINTMENT">("WALK_IN");
  const [appointmentDate, setAppointmentDate] = useState<Date>(() => new Date());
  const [appointmentTime, setAppointmentTime] = useState("09:00");
  const [hasManuallySelectedAppointmentTime, setHasManuallySelectedAppointmentTime] = useState(false);
  const [capacityOverrideReason, setCapacityOverrideReason] = useState("");
  const [needsCapacityOverrideReason, setNeedsCapacityOverrideReason] = useState(false);

  const [walkInPhone, setWalkInPhone] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<UserListItem | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [walkInPetName, setWalkInPetName] = useState("");
  const [walkInSpecies, setWalkInSpecies] = useState<"DOG" | "CAT">("DOG");
  const [walkInBreed, setWalkInBreed] = useState("");
  const [walkInWeight, setWalkInWeight] = useState("");
  const [walkInNotes, setWalkInNotes] = useState("");
  const [walkInServiceId, setWalkInServiceId] = useState("");
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);

  const createBookingV2Mutation = useCreateBookingV2();
  const createPetMutation = useCreatePet();
  const { data: servicesData } = useServices();
  const normalizedWalkInPhone = walkInPhone.trim();
  const [debouncedWalkInPhone, setDebouncedWalkInPhone] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedWalkInPhone(normalizedWalkInPhone), 250);
    return () => window.clearTimeout(timer);
  }, [normalizedWalkInPhone]);

  const shouldSearchPhone =
    isNewBookingModalOpen && !selectedCustomer && normalizedWalkInPhone.length >= 3;
  const isPhoneDebouncing =
    shouldSearchPhone && normalizedWalkInPhone !== debouncedWalkInPhone;
  const phoneSearchQuery = useSearchUserByPhone(
    shouldSearchPhone ? debouncedWalkInPhone : undefined,
  );
  const isSearchingPhone =
    shouldSearchPhone && (isPhoneDebouncing || phoneSearchQuery.isFetching);
  const foundUsers =
    shouldSearchPhone && !isPhoneDebouncing ? phoneSearchQuery.data : undefined;
  const { data: customerDetail } = useUserDetail(selectedCustomer?.id);
  const { data: customerUsersData } = useUsersList({ role: "CUSTOMER", limit: 50 });
  const customerUsers = customerUsersData?.data.filter((customer) => customer.isActive) ?? [];

  const newBookingServiceId = walkInServiceId;
  const newPetWeight = walkInWeight.trim() ? Number(walkInWeight) : undefined;
  const hasValidNewPetWeight = newPetWeight !== undefined && Number.isFinite(newPetWeight) && newPetWeight >= 0;
  const canCheckAppointmentAvailability =
    newBookingMode === "APPOINTMENT" &&
    !!selectedCustomer &&
    !!newBookingServiceId &&
    (!!selectedPetId || hasValidNewPetWeight);
  const appointmentAvailability = useAvailableSlots({
    date: newBookingMode === "APPOINTMENT" ? format(appointmentDate, "yyyy-MM-dd") : "",
    serviceIds: newBookingServiceId ? [newBookingServiceId] : [],
    source: "RECEPTIONIST",
    petId: selectedPetId || undefined,
    weightKg: selectedPetId ? undefined : hasValidNewPetWeight ? newPetWeight : undefined,
    enabled: canCheckAppointmentAvailability,
  });
  const availableAppointmentTimes = appointmentAvailability.data?.slots
    .filter((slot) => slot.available)
    .map((slot) => slot.time) ?? [];
  const nextAvailableAppointmentTime = availableAppointmentTimes.find((time) => time > appointmentTime) ?? "";
  const selectedAppointmentTime = availableAppointmentTimes.includes(appointmentTime)
    ? appointmentTime
    : hasManuallySelectedAppointmentTime
      ? nextAvailableAppointmentTime
      : availableAppointmentTimes[0] ?? "";

  const openWalkInDialog = () => {
    setNewBookingMode("WALK_IN");
    setWalkInServiceId("");
    setCapacityOverrideReason("");
    setNeedsCapacityOverrideReason(false);
    setIsNewBookingModalOpen(true);
  };

  const openAppointmentDialog = (defaultDate?: string) => {
    setNewBookingMode("APPOINTMENT");
    setWalkInServiceId("");
    const base = defaultDate ? new Date(`${defaultDate}T00:00:00`) : new Date();
    setAppointmentDate(Number.isNaN(base.getTime()) ? new Date() : base);
    setAppointmentTime("09:00");
    setHasManuallySelectedAppointmentTime(false);
    setCapacityOverrideReason("");
    setNeedsCapacityOverrideReason(false);
    setIsNewBookingModalOpen(true);
  };

  const handleCreateWalkIn = async () => {
    if (!selectedCustomer) {
      showToast("Vui lòng chọn tài khoản khách hàng đang hoạt động trước khi tạo lịch.", "error");
      return;
    }

    if (!newBookingServiceId) {
      showToast("Vui lòng chọn dịch vụ chính trước khi tiếp nhận.", "error");
      return;
    }

    const parsedWalkInWeight = Number(walkInWeight);
    if (!selectedPetId && (!walkInWeight || !Number.isFinite(parsedWalkInWeight) || parsedWalkInWeight < 0)) {
      showToast("Vui lòng nhập cân nặng của thú cưng (kg) để tính giá theo bảng dịch vụ.", "error");
      return;
    }
    const chosenServiceId = newBookingServiceId;

    const isAppointment = newBookingMode === "APPOINTMENT";
    if (isAppointment && !appointmentDate) {
      showToast("Vui lòng chọn ngày hẹn.", "error");
      return;
    }
    if (
      isAppointment &&
      (appointmentAvailability.isLoading || appointmentAvailability.isError || !availableAppointmentTimes.includes(selectedAppointmentTime))
    ) {
      showToast("Giờ hẹn đang được cập nhật hoặc không còn chỗ. Vui lòng chọn giờ còn chỗ trước khi tạo lịch.", "error");
      return;
    }
    if (needsCapacityOverrideReason && !capacityOverrideReason.trim()) {
      showToast("Vui lòng ghi lý do nhận khách vượt công suất.", "error");
      return;
    }

    setIsSubmittingWalkIn(true);
    let newlyCreatedPetId: string | null = null;
    try {
      let petId = selectedPetId;
      const fallbackPetName = "Chưa cập nhật tên";
      const finalPetName = walkInPetName.trim() || fallbackPetName;

      if (!petId) {
        const pet = await createPetMutation.mutateAsync({
          name: finalPetName,
          species: walkInSpecies,
          breed: walkInBreed.trim() || "Chưa xác định giống",
          weightKg: Number(walkInWeight),
          hasVaccine: false,
          behavioralFlag: "NORMAL",
          notes: walkInNotes,
          userId: selectedCustomer.id,
        });
        petId = pet.id;
        newlyCreatedPetId = pet.id;
        setSelectedPetId(pet.id);
      }

      const appointmentDateStr = isAppointment ? format(appointmentDate, "yyyy-MM-dd") : "";
      const startAtIso = isAppointment
        ? new Date(`${appointmentDateStr}T${selectedAppointmentTime}:00+07:00`).toISOString()
        : new Date().toISOString();

      await createBookingV2Mutation.mutateAsync({
        petId,
        serviceIds: [chosenServiceId],
        startAt: startAtIso,
        customerId: selectedCustomer.id,
        source: isAppointment ? "RECEPTIONIST" : "WALK_IN",
        ...(needsCapacityOverrideReason ? { capacityOverrideReason: capacityOverrideReason.trim() } : {}),
        staffNote: isAppointment
          ? `Đặt lịch hẹn ${format(appointmentDate, "dd/MM/yyyy")} ${selectedAppointmentTime}: ${selectedCustomer.name} (${selectedCustomer.phone || "Chưa có SĐT"}). Ghi chú: ${walkInNotes}`
          : `Tiếp nhận tại quầy: ${selectedCustomer.name} (${selectedCustomer.phone || "Chưa có SĐT"}). Ghi chú: ${walkInNotes}`,
      });

      setIsNewBookingModalOpen(false);
      showToast(
        isAppointment
          ? `Đã tạo lịch hẹn cho ${finalPetName} vào ${selectedAppointmentTime} ngày ${format(appointmentDate, "dd/MM/yyyy")}.`
          : `Đã tiếp nhận thú cưng ${finalPetName} tại quầy.`,
        "success",
      );
      setWalkInPhone("");
      setSelectedCustomer(null);
      setSelectedPetId(null);
      setWalkInPetName("");
      setWalkInBreed("");
      setWalkInWeight("");
      setWalkInNotes("");
      setCapacityOverrideReason("");
      setNeedsCapacityOverrideReason(false);
      onCreated();
    } catch (error) {
      const message = getErrorMessage(error, "");
      if (isAppointment && /khung giờ lúc \d{2}:\d{2} đã kín chỗ/i.test(message)) {
        const conflictedTime = message.match(/khung giờ lúc (\d{2}:\d{2})/i)?.[1] ?? selectedAppointmentTime;
        const refreshedAvailability = await appointmentAvailability.refetch();
        const refreshedTimes = refreshedAvailability.data?.slots
          .filter((slot) => slot.available)
          .map((slot) => slot.time) ?? [];
        const nextAvailableTime = refreshedTimes.find((time) => time > conflictedTime) ?? "";

        setAppointmentTime(conflictedTime);
        setHasManuallySelectedAppointmentTime(true);
        if (nextAvailableTime) {
          showToast(
            `Khung ${conflictedTime} vừa kín. Đã chuyển sang ${nextAvailableTime}; kiểm tra giờ mới rồi bấm đặt lại.`,
            "error",
          );
          return;
        }
      }
      if (!isAppointment && /kín chỗ|hết chỗ/i.test(message)) {
        if (newlyCreatedPetId) setSelectedPetId(newlyCreatedPetId);
        setNeedsCapacityOverrideReason(true);
        showToast(message || "Khung công suất kế tiếp đã kín. Ghi lý do nếu cần tiếp nhận khách.", "error");
        return;
      }
      const fallback = isAppointment ? "Không thể tạo lịch hẹn." : "Không thể tiếp nhận tại quầy.";
      const failureMessage = getErrorMessage(error, fallback);
      showToast(
        newlyCreatedPetId
          ? `Đã lưu hồ sơ thú cưng nhưng ${isAppointment ? "chưa tạo được lịch hẹn" : "chưa hoàn tất tiếp nhận"}. ${failureMessage}`
          : failureMessage,
        "error",
      );
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  const dialogProps: BookingCreateDialogProps = {
    isNewBookingModalOpen,
    setIsNewBookingModalOpen,
    newBookingMode,
    appointmentDate,
    setAppointmentDate,
    setAppointmentTime: (time: string) => {
      setAppointmentTime(time);
      setHasManuallySelectedAppointmentTime(true);
    },
    selectedAppointmentTime,
    requestedAppointmentTime: appointmentTime,
    hasManuallySelectedAppointmentTime,
    canCheckAppointmentAvailability,
    availableAppointmentTimes,
    appointmentAvailability,
    selectedCustomer,
    setSelectedCustomer,
    customerUsers,
    foundUsers,
    isSearchingPhone,
    customerDetail,
    walkInPhone,
    setWalkInPhone,
    selectedPetId,
    setSelectedPetId,
    walkInPetName,
    setWalkInPetName,
    walkInSpecies,
    setWalkInSpecies,
    walkInBreed,
    setWalkInBreed,
    walkInWeight,
    setWalkInWeight,
    walkInNotes,
    setWalkInNotes,
    needsCapacityOverrideReason,
    capacityOverrideReason,
    setCapacityOverrideReason,
    newBookingServiceId,
    setWalkInServiceId,
    servicesData,
    isSubmittingWalkIn,
    handleCreateWalkIn,
  };

  return { openWalkInDialog, openAppointmentDialog, dialogProps };
}
