"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingAppointmentFields } from "@/components/admin/bookings/booking-appointment-fields";
import { BookingCustomerSection } from "@/components/admin/bookings/booking-customer-section";
import { BookingPetSection } from "@/components/admin/bookings/booking-pet-section";
import { BookingServiceSection } from "@/components/admin/bookings/booking-service-section";
import type { BookingCreateDialogProps } from "@/components/admin/bookings/booking-create-dialog.types";

export type { BookingCreateDialogProps } from "@/components/admin/bookings/booking-create-dialog.types";

export function BookingCreateDialog(props: BookingCreateDialogProps) {
  const isAppointment = props.newBookingMode === "APPOINTMENT";

  return (
    <Dialog open={props.isNewBookingModalOpen} onOpenChange={props.setIsNewBookingModalOpen}>
      <DialogContent className="flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border-subtle bg-slate-50 p-5 text-left">
          <DialogTitle className="text-base font-bold text-ink">
            {isAppointment ? "Đặt lịch hẹn mới" : "Tiếp nhận khách hàng tại quầy"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-text">
            {isAppointment
              ? "Dùng cho khách gọi điện hoặc nhắn tin. Tìm khách bằng số điện thoại, chọn thú cưng, dịch vụ và giờ còn chỗ."
              : "Tra cứu khách hàng, chọn thú cưng và gói dịch vụ tiếp nhận"}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-4 text-sm sm:p-6">
          {!isAppointment && (
            <p className="mb-4 rounded-lg border border-border-subtle bg-slate-50 px-3 py-2 leading-5 text-muted-text">
              Khách được tiếp nhận ngay và phiếu ghi giờ thực tế. Nếu khách đến giữa hai khung 30 phút, công suất tính vào khung kế tiếp; ví dụ, phiếu ghi 09:17 nhưng lượt được tính ở khung 09:30.
            </p>
          )}

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <BookingCustomerSection {...props} />
              <BookingPetSection {...props} />
            </div>
            <div className="space-y-4">
              <BookingServiceSection {...props} />
              {isAppointment && (
                <BookingAppointmentFields
                  date={props.appointmentDate}
                  times={props.availableAppointmentTimes}
                  selectedTime={props.selectedAppointmentTime}
                  requestedTime={props.requestedAppointmentTime}
                  hasManuallySelectedTime={props.hasManuallySelectedAppointmentTime}
                  isAvailabilityReady={props.canCheckAppointmentAvailability}
                  isLoading={props.appointmentAvailability.isLoading}
                  isError={props.appointmentAvailability.isError}
                  onDateChange={props.setAppointmentDate}
                  onTimeChange={props.setAppointmentTime}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border-subtle bg-slate-50 p-4">
          <Button
            type="button"
            onClick={() => props.setIsNewBookingModalOpen(false)}
            variant="outline"
            className="h-10 rounded-lg border-border-subtle bg-surface px-4 text-sm font-semibold hover:bg-slate-200"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={
              props.isSubmittingWalkIn ||
              !props.selectedCustomer ||
              !props.newBookingServiceId ||
              (isAppointment && (
                props.appointmentAvailability.isLoading ||
                props.appointmentAvailability.isError ||
                !props.availableAppointmentTimes.includes(props.selectedAppointmentTime)
              )) ||
              (props.needsCapacityOverrideReason && !props.capacityOverrideReason.trim())
            }
            onClick={props.handleCreateWalkIn}
            className="h-10 gap-1.5 rounded-lg px-5 text-sm font-bold shadow-xs"
          >
            {props.isSubmittingWalkIn ? (
              <>
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                {isAppointment ? "Đang đặt lịch..." : "Đang tạo phiếu..."}
              </>
            ) : isAppointment ? (
              "Đặt lịch hẹn"
            ) : props.needsCapacityOverrideReason ? (
              "Tiếp nhận vượt công suất"
            ) : (
              "Tạo phiếu tiếp nhận"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
