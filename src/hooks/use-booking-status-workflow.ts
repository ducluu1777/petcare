"use client";

import * as React from "react";
import type { BookingItem, useUpdateBookingStatus, useUpdateBookingStatusV2 } from "@/hooks/use-bookings";
import type { useAdminBookingDirectory } from "@/hooks/use-admin-booking-directory";
import { mapBookingItemToRecord, type BookingRecord } from "@/lib/admin-booking-record";

type BookingListSetter = ReturnType<typeof useAdminBookingDirectory>["setBookings"];
type BookingRefetch = ReturnType<typeof useAdminBookingDirectory>["refetch"];
type ShowToast = (text: string, type?: "success" | "error" | "info") => void;

type UseBookingStatusWorkflowOptions = {
  bookings: BookingRecord[];
  selectedBooking: BookingRecord | null;
  setSelectedBooking: React.Dispatch<React.SetStateAction<BookingRecord | null>>;
  setBookings: BookingListSetter;
  refetch: BookingRefetch;
  showToast: ShowToast;
  updateStatusMutation: ReturnType<typeof useUpdateBookingStatus>;
  updateStatusV2Mutation: ReturnType<typeof useUpdateBookingStatusV2>;
};

export function useBookingStatusWorkflow({
  bookings,
  selectedBooking,
  setSelectedBooking,
  setBookings,
  refetch,
  showToast,
  updateStatusMutation,
  updateStatusV2Mutation,
}: UseBookingStatusWorkflowOptions) {
  const [isNoShowDialogOpen, setIsNoShowDialogOpen] = React.useState(false);
  const [noShowReason, setNoShowReason] = React.useState("");
  const [clockNow, setClockNow] = React.useState(() => Date.now());

  const noShowEligibleAt = selectedBooking?.startAt
    ? new Date(selectedBooking.startAt).getTime() + 20 * 60 * 1000
    : null;
  const canMarkNoShow = selectedBooking?.statusV2 === "BOOKED"
    && noShowEligibleAt !== null
    && clockNow >= noShowEligibleAt;
  const nextBookingAction = selectedBooking?.statusV2
    ? selectedBooking.statusV2 === "BOOKED"
      ? { target: "ARRIVED" as const, label: "Xác nhận đã tiếp nhận" }
      : selectedBooking.statusV2 === "ARRIVED"
        ? { target: "IN_PROGRESS" as const, label: "Bắt đầu chăm sóc" }
        : selectedBooking.statusV2 === "IN_SERVICE"
          ? { target: "READY_FOR_PICKUP" as const, label: "Báo khách đến nhận" }
          : null
    : selectedBooking?.status === "WAITING_CHECKIN"
      ? { target: "IN_PROGRESS" as const, label: "Bắt đầu làm dịch vụ" }
      : selectedBooking?.status === "IN_PROGRESS"
        ? { target: "READY_FOR_PICKUP" as const, label: "Báo khách đến nhận" }
        : null;

  React.useEffect(() => {
    if (selectedBooking?.statusV2 !== "BOOKED" || !selectedBooking.startAt) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [selectedBooking?.id, selectedBooking?.startAt, selectedBooking?.statusV2]);

  const handleUpdateStatus = async (
    bookingId: string,
    newStatus: BookingRecord["status"],
    reason?: string,
    currentOverride?: BookingRecord,
    successMessage?: string,
  ): Promise<boolean> => {
    const current = currentOverride?.id === bookingId
      ? currentOverride
      : selectedBooking?.id === bookingId
        ? selectedBooking
        : bookings.find((booking) => booking.id === bookingId);
    if (!current) return false;
    if (["CANCELLED", "NO_SHOW", "COMPLETED"].includes(current.status)) {
      showToast("Lịch đã kết thúc nên không thể thay đổi trạng thái.", "error");
      return false;
    }
    const v2StatusMap: Partial<Record<BookingRecord["status"], NonNullable<BookingItem["statusV2"]>>> = {
      ARRIVED: "ARRIVED",
      IN_PROGRESS: "IN_SERVICE",
      READY_FOR_PICKUP: "READY_FOR_PICKUP",
      COMPLETED: "DONE",
      CANCELLED: "CANCELLED",
      NO_SHOW: "NO_SHOW",
    };

    try {
      if (current.statusV2) {
        const toStatus = v2StatusMap[newStatus];
        if (!toStatus) throw new Error("Không thể chuyển lịch sang trạng thái này.");
        await updateStatusV2Mutation.mutateAsync({
          id: bookingId,
          fromStatus: current.statusV2,
          toStatus,
          reason,
        });
      } else {
        const backendStatusMap: Partial<Record<BookingRecord["status"], string>> = {
          IN_PROGRESS: "IN_PROGRESS",
          READY_FOR_PICKUP: "READY_FOR_PICKUP",
          COMPLETED: "COMPLETED",
          CANCELLED: "CANCELLED",
        };
        const backendStatus = backendStatusMap[newStatus];
        if (!backendStatus) throw new Error("Không thể chuyển lịch sang trạng thái này.");
        await updateStatusMutation.mutateAsync({
          id: bookingId,
          status: backendStatus,
          reason,
        });
      }

      const refreshed = await refetch();
      const updated = refreshed.data?.data.find((booking) => booking.id === bookingId);
      if (updated) {
        const record = mapBookingItemToRecord(updated);
        setBookings((previous) => previous.map((booking) => booking.id === bookingId ? record : booking));
        setSelectedBooking((previous) => previous?.id === bookingId ? record : previous);
      }
      showToast(successMessage ?? "Đã cập nhật trạng thái lịch hẹn.", "success");
      return true;
    } catch (error) {
      await refetch();
      showToast(error instanceof Error ? error.message : "Không thể cập nhật trạng thái lịch. Vui lòng thử lại.", "error");
      return false;
    }
  };

  const handleMarkNoShow = async () => {
    if (!selectedBooking || !canMarkNoShow) return;
    const reason = noShowReason.trim();
    if (!reason) {
      showToast("Vui lòng ghi lý do khách không đến.", "error");
      return;
    }

    const updated = await handleUpdateStatus(selectedBooking.id, "NO_SHOW", reason);
    if (updated) {
      setIsNoShowDialogOpen(false);
      setNoShowReason("");
    }
  };

  const handleNoShowDialogOpenChange = (open: boolean) => {
    setIsNoShowDialogOpen(open);
    if (!open) setNoShowReason("");
  };

  return {
    canMarkNoShow,
    handleMarkNoShow,
    handleNoShowDialogOpenChange,
    handleUpdateStatus,
    isNoShowDialogOpen,
    isUpdatingStatus: updateStatusMutation.isPending || updateStatusV2Mutation.isPending,
    nextBookingAction,
    noShowEligibleAt,
    noShowReason,
    openNoShowDialog: () => setIsNoShowDialogOpen(true),
    setNoShowReason,
  };
}
