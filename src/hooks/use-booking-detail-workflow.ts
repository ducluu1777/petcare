"use client";

import * as React from "react";
import {
  useAssignStaff,
  useCreateBookingReweighQuote,
  useUpdateBookingAddons,
} from "@/hooks/use-bookings";
import { useServices } from "@/hooks/use-services";
import { useUpdateBehavioralFlag } from "@/hooks/use-pets";
import { useUsersList } from "@/hooks/use-users";
import { mapBookingItemToRecord, type BookingRecord } from "@/lib/admin-booking-record";
import { useAdminBookingDirectory } from "@/hooks/use-admin-booking-directory";

type BookingRefetch = ReturnType<typeof useAdminBookingDirectory>["refetch"];
type BookingListSetter = ReturnType<typeof useAdminBookingDirectory>["setBookings"];
type ShowToast = (text: string, type?: "success" | "error" | "info") => void;

type UseBookingDetailWorkflowOptions = {
  selectedBooking: BookingRecord | null;
  setSelectedBooking: React.Dispatch<React.SetStateAction<BookingRecord | null>>;
  setSheetOpen: (open: boolean) => void;
  setBookings: BookingListSetter;
  refetch: BookingRefetch;
  resetCashierForBooking: (booking: BookingRecord) => void;
  showToast: ShowToast;
  onWeightSavedAndStart: (booking: BookingRecord) => Promise<boolean>;
};

export function useBookingDetailWorkflow({
  selectedBooking,
  setSelectedBooking,
  setSheetOpen,
  setBookings,
  refetch,
  resetCashierForBooking,
  showToast,
  onWeightSavedAndStart,
}: UseBookingDetailWorkflowOptions) {
  const [isAssignStaffOpen, setIsAssignStaffOpen] = React.useState(false);
  const [targetStaffId, setTargetStaffId] = React.useState("");
  const [editWeightVal, setEditWeightVal] = React.useState("");
  const [isAddonPanelOpen, setIsAddonPanelOpen] = React.useState(false);

  const updateAddonsMutation = useUpdateBookingAddons();
  const createReweighQuoteMutation = useCreateBookingReweighQuote();
  const updateBehaviorMutation = useUpdateBehavioralFlag();
  const assignStaffMutation = useAssignStaff();
  const { data: addonServices } = useServices(undefined, true);
  const { data: staffListResponse } = useUsersList({ role: "STAFF" });
  const staffMembers = staffListResponse?.data ?? [];

  const open = (booking: BookingRecord) => {
    setSelectedBooking(booking);
    resetCashierForBooking(booking);
    setIsAddonPanelOpen(false);
    setIsAssignStaffOpen(false);
    setEditWeightVal(booking.pet.weight?.toString() ?? "");
    setTargetStaffId("");
    setSheetOpen(true);
  };

  const savePetWeight = async () => {
    const booking = selectedBooking;
    if (!booking) return;
    const weight = Number.parseFloat(editWeightVal);
    if (!Number.isFinite(weight) || weight < 0.1 || weight > 100 || !booking.pet.id) {
      showToast("Nhập cân nặng thực tế từ 0,1 đến 100 kg.", "error");
      return;
    }
    if (booking.statusV2 !== "ARRIVED") {
      showToast("Chỉ cập nhật cân nặng sau khi đã tiếp nhận thú cưng.", "error");
      return;
    }

    try {
      const quote = await createReweighQuoteMutation.mutateAsync({ id: booking.id, weightKg: weight });
      const refreshed = await refetch();
      const updatedItem = refreshed.data?.data.find((item) => item.id === booking.id);
      if (!updatedItem) {
        showToast("Không tải lại được lịch sau khi cập nhật cân nặng. Hãy thử mở lại lịch.", "error");
        return;
      }
      const updatedRecord = mapBookingItemToRecord(updatedItem);
      setSelectedBooking(updatedRecord);
      setBookings((previous) => previous.map((item) => item.id === booking.id ? updatedRecord : item));
      if (!quote.supported) {
        showToast(quote.reason || "PetCare chưa thể nhận thú cưng ở mức cân nặng này.", "error");
      } else {
        await onWeightSavedAndStart(updatedRecord);
      }
    } catch (error) {
      showToast(error instanceof Error && error.message ? error.message : "Không cập nhật được cân nặng và giá.", "error");
    }
  };

  const startService = async () => {
    const booking = selectedBooking;
    if (!booking || booking.statusV2 !== "ARRIVED") return;
    const weightInput = editWeightVal.trim();
    const hasWeightChange = weightInput !== "" && Number(weightInput) !== booking.pet.weight;
    if (hasWeightChange) {
      await savePetWeight();
      return;
    }
    await onWeightSavedAndStart(booking);
  };

  const changeBehaviorFlag = async (flag: NonNullable<BookingRecord["pet"]["behavioralFlag"]>) => {
    const booking = selectedBooking;
    if (!booking?.pet.id) return;

    try {
      await updateBehaviorMutation.mutateAsync({ id: booking.pet.id, flag });
      setSelectedBooking((previous) => previous ? ({
        ...previous,
        pet: { ...previous.pet, behavioralFlag: flag },
      }) : null);
      setBookings((previous) => previous.map((item) => item.id === booking.id ? ({
        ...item,
        pet: { ...item.pet, behavioralFlag: flag },
      }) : item));
    } catch (error) {
      showToast(error instanceof Error && error.message ? error.message : "Chưa lưu được thay đổi. Vui lòng thử lại.", "error");
    }
  };

  const addAddon = async (serviceId: string) => {
    if (!selectedBooking) return;
    const addonName = addonServices?.find((service) => service.id === serviceId)?.name || "Dịch vụ";
    try {
      const updatedItem = await updateAddonsMutation.mutateAsync({
        id: selectedBooking.id,
        addServiceIds: [serviceId],
      });
      if (updatedItem) {
        const updatedRecord = mapBookingItemToRecord(updatedItem);
        setSelectedBooking(updatedRecord);
        setBookings((previous) => previous.map((booking) => booking.id === updatedRecord.id ? updatedRecord : booking));
      }
      await refetch();
      showToast(`Đã thêm ${addonName} vào lịch.`);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : `Chưa thêm được ${addonName}. Vui lòng thử lại.`;
      showToast(message, "error");
    }
  };

  const removeAddon = async (bookingServiceId: string) => {
    if (!selectedBooking) return;
    const addonName = selectedBooking.service.items.find((item) => item.id === bookingServiceId)?.name || "Dịch vụ";
    try {
      const updatedItem = await updateAddonsMutation.mutateAsync({
        id: selectedBooking.id,
        removeBookingServiceIds: [bookingServiceId],
      });
      if (updatedItem) {
        const updatedRecord = mapBookingItemToRecord(updatedItem);
        setSelectedBooking(updatedRecord);
        setBookings((previous) => previous.map((booking) => booking.id === updatedRecord.id ? updatedRecord : booking));
      }
      await refetch();
      showToast(`Đã gỡ ${addonName} khỏi lịch.`);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : `Chưa gỡ được ${addonName}. Vui lòng thử lại.`;
      showToast(message, "error");
    }
  };

  const assignStaff = async (staffId: string) => {
    if (!selectedBooking) return;
    const staff = staffMembers.find((member) => member.id === staffId);
    const staffName = staff?.name ?? "Nhân viên được phân công";

    try {
      await assignStaffMutation.mutateAsync({ id: selectedBooking.id, staffId });
      setSelectedBooking((current) => current ? {
        ...current,
        service: { ...current.service, assignedStaff: staffName },
      } : null);
      setBookings((current) => current.map((booking) => booking.id === selectedBooking.id ? {
        ...booking,
        service: { ...booking.service, assignedStaff: staffName },
      } : booking));
      setIsAssignStaffOpen(false);
    } catch (error) {
      showToast(error instanceof Error && error.message ? error.message : "Không thể phân công nhân viên.", "error");
    }
  };

  return {
    open,
    state: {
      editWeightVal,
      isSavingWeight: createReweighQuoteMutation.isPending,
      isSavingBehavior: updateBehaviorMutation.isPending,
      staffMembers,
      isAssignStaffOpen,
      targetStaffId,
      isAssigningStaff: assignStaffMutation.isPending,
      addonServices: addonServices ?? [],
      isAddonPanelOpen,
      isUpdatingAddons: updateAddonsMutation.isPending,
    },
    actions: {
      onWeightValueChange: setEditWeightVal,
      onSaveWeight: savePetWeight,
      onStartService: startService,
      onBehaviorChange: changeBehaviorFlag,
      onToggleStaffAssignment: () => setIsAssignStaffOpen((current) => !current),
      onStaffChange: setTargetStaffId,
      onCancelStaffAssignment: () => setIsAssignStaffOpen(false),
      onAssignStaff: () => { void assignStaff(targetStaffId); },
      onToggleAddons: () => setIsAddonPanelOpen((current) => !current),
      onAddAddon: (serviceId: string) => { void addAddon(serviceId); },
      onRemoveAddon: (bookingServiceId: string) => { void removeAddon(bookingServiceId); },
    },
  };
}
