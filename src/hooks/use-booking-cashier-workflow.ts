"use client";

import * as React from "react";
import { BookingCashierCard } from "@/components/admin/bookings/booking-cashier-card";
import { useAdminBookingDirectory } from "@/hooks/use-admin-booking-directory";
import { useUpdateBookingStatus, useUpdateBookingStatusV2 } from "@/hooks/use-bookings";
import {
  useBookingQrIntent,
  useCancelBookingQrIntent,
  useCreateBookingQrIntent,
  useCreateTransaction,
  useConfirmBookingQrPayment,
} from "@/hooks/use-transactions";
import { useSepayAccountConfig } from "@/hooks/use-payment-config";
import { useValidateVoucher } from "@/hooks/use-vouchers";
import { VOUCHER_UNAVAILABLE_MESSAGE } from "@/lib/voucher-messages";
import { buildVietQrImageUrl } from "@/lib/payment-qr";
import { mapBookingItemToRecord, type BookingRecord } from "@/lib/admin-booking-record";

type ShowToast = (text: string, type?: "success" | "error" | "info") => void;
type BookingRefetch = ReturnType<typeof useAdminBookingDirectory>["refetch"];
type BookingListSetter = ReturnType<typeof useAdminBookingDirectory>["setBookings"];

type UseBookingCashierWorkflowOptions = {
  selectedBooking: BookingRecord | null;
  setSelectedBooking: React.Dispatch<React.SetStateAction<BookingRecord | null>>;
  setBookings: BookingListSetter;
  isSheetOpen: boolean;
  refetch: BookingRefetch;
  showToast: ShowToast;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useBookingCashierWorkflow({
  selectedBooking,
  setSelectedBooking,
  setBookings,
  isSheetOpen,
  refetch,
  showToast,
}: UseBookingCashierWorkflowOptions) {
  const [cashierMethod, setCashierMethod] = React.useState<"VIETQR" | "CASH">("VIETQR");
  const [cashGiven, setCashGiven] = React.useState("");
  const [isPaidSuccess, setIsPaidSuccess] = React.useState(false);
  const [isPaying, setIsPaying] = React.useState(false);
  const [cashierVoucherCode, setCashierVoucherCode] = React.useState("");
  const [cashierVoucherDiscount, setCashierVoucherDiscount] = React.useState(0);
  const [cashierVoucherError, setCashierVoucherError] = React.useState<string | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = React.useState(false);
  const [copiedField, setCopiedField] = React.useState<"account" | "code" | null>(null);

  const createTransactionMutation = useCreateTransaction();
  const createQrPaymentIntentMutation = useCreateBookingQrIntent();
  const cancelQrPaymentIntentMutation = useCancelBookingQrIntent();
  const confirmBookingQrPaymentMutation = useConfirmBookingQrPayment();
  const updateStatusMutation = useUpdateBookingStatus();
  const updateStatusV2Mutation = useUpdateBookingStatusV2();
  const validateVoucherMutation = useValidateVoucher();
  const spaPromotionEligible = selectedBooking?.type === "SPA" && selectedBooking.spaBookingPromotionEligible
    && selectedBooking.financial.serviceRemainingAmount > 0;
  const spaPromotionActive = Boolean(spaPromotionEligible);
  const spaPromotionDiscount = spaPromotionEligible
    ? Math.round(Math.max(0, selectedBooking?.financial.serviceRemainingAmount ?? 0) * 0.05)
    : 0;
  const sepayAccountQuery = useSepayAccountConfig("BOOKING");
  const sepayAccount = sepayAccountQuery.data;
  const qrPaymentIntentQuery = useBookingQrIntent(
    selectedBooking?.id,
    isSheetOpen &&
      cashierMethod === "VIETQR" &&
      selectedBooking?.status !== "COMPLETED" &&
      selectedBooking?.financial.paymentStatus === "UNPAID",
  );
  const qrPaymentIntent = qrPaymentIntentQuery.data ?? null;
  const bookingQrImageUrl = qrPaymentIntent?.status === "PENDING"
    ? buildVietQrImageUrl(sepayAccount, qrPaymentIntent.amount, qrPaymentIntent.transferInfo)
    : null;

  const effectiveRemaining = React.useMemo(() => {
    if (!selectedBooking) return 0;
    const selectedDiscount = cashierVoucherDiscount > 0 ? cashierVoucherDiscount : spaPromotionDiscount;
    const serviceRemaining = Math.max(0, selectedBooking.financial.serviceRemainingAmount - selectedDiscount);
    const careFeeRemaining = selectedBooking.latePickupFeePaid ? 0 : selectedBooking.latePickupFeeAmount;
    return serviceRemaining + careFeeRemaining;
  }, [selectedBooking, cashierVoucherDiscount, spaPromotionDiscount]);
  const serviceAmountToCollect = selectedBooking
    ? Math.max(0, selectedBooking.financial.serviceRemainingAmount - (cashierVoucherDiscount > 0 ? cashierVoucherDiscount : spaPromotionDiscount))
    : 0;
  const pointsToEarn = Math.floor(serviceAmountToCollect / 10000);

  const resetForBooking = (booking: BookingRecord) => {
    setIsPaidSuccess(booking.status === "COMPLETED");
    setCashGiven(booking.financial.remainingAmount.toString());
    setCashierVoucherCode("");
    setCashierVoucherDiscount(0);
    setCashierVoucherError(null);
    setCopiedField(null);
  };

  const handleCreateQrIntent = async () => {
    if (!selectedBooking) return;
    if (!sepayAccount?.configured) {
      showToast("Chưa cấu hình tài khoản nhận VietQR. Chọn tiền mặt hoặc liên hệ quản trị viên.", "error");
      return;
    }
    setIsPaying(true);
    try {
      const intent = await createQrPaymentIntentMutation.mutateAsync({
        bookingId: selectedBooking.id,
        voucherCode: cashierVoucherDiscount > 0 ? cashierVoucherCode.trim() || undefined : undefined,
      });
      showToast("Đã tạo mã QR. PetCare sẽ tự cập nhật khi SePay báo nhận tiền.", "success");
    } catch (error) {
      showToast(getErrorMessage(error, "Không tạo được mã QR. Vui lòng thử lại."), "error");
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancelQrIntent = async () => {
    if (!qrPaymentIntent) return;
    setIsPaying(true);
    try {
      await cancelQrPaymentIntentMutation.mutateAsync(qrPaymentIntent.id);
      showToast("Đã hủy mã QR. Có thể tạo mã mới hoặc chọn tiền mặt.", "success");
    } catch (error) {
      showToast(getErrorMessage(error, "Không hủy được mã QR."), "error");
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirmBankTransfer = async () => {
    if (!selectedBooking || !qrPaymentIntent || qrPaymentIntent.status !== "PENDING") return;
    setIsPaying(true);
    try {
      await confirmBookingQrPaymentMutation.mutateAsync({
        intentId: qrPaymentIntent.id,
        receivedAmount: qrPaymentIntent.amount,
        excessRefunded: false,
      });
      const refreshed = await refetch();
      const latest = refreshed.data?.data.find((booking) => booking.id === selectedBooking.id);
      if (latest) {
        const record = mapBookingItemToRecord(latest);
        setBookings((previous) => previous.map((booking) => booking.id === record.id ? record : booking));
        setSelectedBooking((current) => current?.id === record.id ? record : current);
      }
      showToast("Đã ghi nhận khoản chuyển. Xác nhận bàn giao để hoàn tất lịch hẹn.", "success");
    } catch (error) {
      await refetch();
      showToast(getErrorMessage(error, "Không xác nhận được khoản chuyển. Vui lòng tải lại lịch hẹn."), "error");
    } finally {
      setIsPaying(false);
    }
  };

  React.useEffect(() => {
    const activeIntentStatus = qrPaymentIntentQuery.data?.status;
    if (
      !isSheetOpen ||
      !selectedBooking ||
      !activeIntentStatus ||
      activeIntentStatus === "CANCELLED" ||
      activeIntentStatus === "REVIEW" ||
      selectedBooking.financial.paymentStatus === "PAID"
    ) return;

    const timer = window.setInterval(async () => {
      const refreshed = await refetch();
      const latest = refreshed.data?.data.find((item) => item.id === selectedBooking.id);
      if (!latest) return;
      const record = mapBookingItemToRecord(latest);
      if (selectedBooking.financial.paymentStatus !== "PAID" && record.financial.paymentStatus === "PAID") {
        showToast("Đã xác nhận đủ chuyển khoản. Xác nhận bàn giao để hoàn tất lịch hẹn.", "success");
      }
      setBookings((previous) => previous.map((item) => item.id === record.id ? record : item));
      setSelectedBooking((previous) => previous?.id === record.id ? record : previous);
      setIsPaidSuccess(record.status === "COMPLETED");
    }, 4000);

    return () => window.clearInterval(timer);
  }, [
    isSheetOpen,
    selectedBooking?.id,
    selectedBooking?.financial.paymentStatus,
    selectedBooking,
    setBookings,
    setSelectedBooking,
    showToast,
    qrPaymentIntentQuery.data?.status,
    refetch,
  ]);

  const handleCompleteHandover = async () => {
    if (!selectedBooking) return;
    if (selectedBooking.financial.paymentStatus !== "PAID") {
      showToast("Chỉ có thể hoàn tất sau khi đã nhận đủ tiền.", "error");
      return;
    }
    if (selectedBooking.status !== "READY_FOR_PICKUP") {
      showToast("Lịch hẹn không còn ở trạng thái chờ khách nhận.", "error");
      return;
    }

    setIsPaying(true);
    try {
      if (selectedBooking.statusV2) {
        await updateStatusV2Mutation.mutateAsync({
          id: selectedBooking.id,
          fromStatus: "READY_FOR_PICKUP",
          toStatus: "DONE",
        });
      } else {
        await updateStatusMutation.mutateAsync({ id: selectedBooking.id, status: "COMPLETED" });
      }
      const refreshed = await refetch();
      const latest = refreshed.data?.data.find((item) => item.id === selectedBooking.id);
      const record = latest ? mapBookingItemToRecord(latest) : { ...selectedBooking, status: "COMPLETED" as const };
      setBookings((previous) => previous.map((item) => item.id === record.id ? record : item));
      setSelectedBooking(record);
      setIsPaidSuccess(true);
      showToast(`Đã xác nhận bàn giao và hoàn tất phiếu ${selectedBooking.code}.`, "success");
    } catch (error) {
      await refetch();
      showToast(getErrorMessage(error, "Không thể xác nhận bàn giao. Vui lòng tải lại lịch hẹn."), "error");
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedBooking || cashierMethod !== "CASH") return;
    if ((Number(cashGiven) || 0) < effectiveRemaining) {
      showToast("Số tiền nhận chưa đủ để tất toán hóa đơn.", "error");
      return;
    }
    if (selectedBooking.financial.paymentStatus === "PAID" || effectiveRemaining <= 0) {
      showToast("Lịch hẹn không còn khoản nào cần thu.", "error");
      return;
    }
    if (
      (selectedBooking.statusV2 && selectedBooking.statusV2 !== "READY_FOR_PICKUP") ||
      (!selectedBooking.statusV2 && selectedBooking.status !== "READY_FOR_PICKUP")
    ) {
      showToast("Chỉ có thể tất toán sau khi dịch vụ hoàn tất và chờ khách nhận thú cưng.", "error");
      return;
    }

    setIsPaying(true);
    try {
      await createTransactionMutation.mutateAsync({
        bookingId: selectedBooking.id,
        amount: effectiveRemaining,
        type: "FINAL_PAYMENT",
        paymentMethod: "CASH",
        voucherCode: cashierVoucherDiscount > 0 ? cashierVoucherCode.trim() || undefined : undefined,
      });

      const refreshed = await refetch();
      const latest = refreshed.data?.data.find((item) => item.id === selectedBooking.id);
      const mapped = latest ? mapBookingItemToRecord(latest) : selectedBooking;
      const additionalDiscount = Math.max(
        0,
        selectedBooking.financial.serviceRemainingAmount - serviceAmountToCollect,
      );
      const record: BookingRecord = {
        ...mapped,
        latePickupFeePaid: selectedBooking.latePickupFeeAmount > 0 || mapped.latePickupFeePaid,
        financial: {
          ...mapped.financial,
          discount: mapped.financial.discount + (latest ? 0 : additionalDiscount),
          finalAmount: mapped.financial.finalAmount - additionalDiscount,
          serviceRemainingAmount: 0,
          remainingAmount: 0,
          paymentStatus: "PAID",
          paidMethod: "Tiền mặt",
        },
      };
      setBookings((previous) => previous.map((booking) => booking.id === record.id ? record : booking));
      setSelectedBooking(record);
      setIsPaidSuccess(false);
      showToast(`Đã thu tổng ${effectiveRemaining.toLocaleString("vi-VN")}₫. Bàn giao thú cưng rồi xác nhận hoàn tất lịch ${selectedBooking.code}.`, "success");
    } catch (error) {
      const refreshed = await refetch();
      const latest = refreshed.data?.data.find((item) => item.id === selectedBooking.id);
      if (latest) {
        const record = mapBookingItemToRecord(latest);
        setBookings((previous) => previous.map((booking) => booking.id === record.id ? record : booking));
        setSelectedBooking(record);
        if (record.financial.paymentStatus === "PAID") {
          setIsPaidSuccess(record.status === "COMPLETED");
          showToast("Tiền đã được ghi nhận. Xác nhận bàn giao để hoàn tất lịch hẹn.", "error");
          return;
        }
      }
      showToast(getErrorMessage(error, "Không thể hoàn tất thanh toán. Hãy tải lại lịch trước khi thử lại."), "error");
    } finally {
      setIsPaying(false);
    }
  };

  const handleApplyCashierVoucher = async () => {
    setIsValidatingVoucher(true);
    setCashierVoucherError(null);
    try {
      const result = await validateVoucherMutation.mutateAsync({
        code: cashierVoucherCode.trim().toUpperCase(),
        orderTotal: selectedBooking?.financial.subtotal ?? 0,
      });
      if (result.valid) {
        setCashierVoucherDiscount(result.discount);
        setCashierVoucherCode(cashierVoucherCode.trim().toUpperCase());
      }
    } catch (error) {
      setCashierVoucherError(getErrorMessage(error, VOUCHER_UNAVAILABLE_MESSAGE));
      setCashierVoucherDiscount(0);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const cashierCardState: React.ComponentProps<typeof BookingCashierCard>["state"] | null = selectedBooking ? {
    selectedBooking,
    cashierMethod,
    cashGiven,
    isPaidSuccess,
    isPaying,
    cashierVoucherCode,
    cashierVoucherDiscount,
    cashierVoucherError,
    isValidatingVoucher,
    effectiveRemaining,
    spaPromotionActive,
    spaPromotionDiscount,
    spaPromotionEligible,
    pointsToEarn,
    qrPaymentIntent,
    sepayAccount,
    sepayAccountLoading: sepayAccountQuery.isLoading,
    bookingQrImageUrl,
    copiedField,
  } : null;

  const cashierCardActions: React.ComponentProps<typeof BookingCashierCard>["actions"] = {
    setCashierMethod,
    setCashGiven,
    setCashierVoucherCode: (value) => {
      setCashierVoucherCode(value);
      setCashierVoucherDiscount(0);
      setCashierVoucherError(null);
    },
    setCashierVoucherError,
    setCashierVoucherDiscount,
    onApplyVoucher: handleApplyCashierVoucher,
    onCopyAccount: () => {
      navigator.clipboard.writeText(sepayAccount?.accountNumber || "");
      setCopiedField("account");
      window.setTimeout(() => setCopiedField(null), 2000);
    },
    onCopyTransferInfo: () => {
      navigator.clipboard.writeText(qrPaymentIntent?.status === "PENDING" ? qrPaymentIntent.transferInfo : selectedBooking?.code ?? "");
      setCopiedField("code");
      window.setTimeout(() => setCopiedField(null), 2000);
    },
    onCreateQrIntent: handleCreateQrIntent,
    onCancelQrIntent: handleCancelQrIntent,
    onConfirmPayment: handleConfirmPayment,
    onConfirmBankTransfer: handleConfirmBankTransfer,
    onCompleteHandover: handleCompleteHandover,
    onPrintReceipt: () => {
      if (!selectedBooking) return;
      showToast(`Đang mở bản in hoá đơn thanh toán #${selectedBooking.code}...`, "info");
      window.setTimeout(() => window.print(), 350);
    },
  };

  return {
    resetForBooking,
    updateStatusMutation,
    updateStatusV2Mutation,
    cashierVoucherCode,
    cashierVoucherDiscount,
    isPaidSuccess,
    effectiveRemaining,
    cashierCardState,
    cashierCardActions,
  };
}
