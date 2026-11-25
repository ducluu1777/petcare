import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { BookingCashierQrSectionProps } from "@/components/admin/bookings/booking-cashier-card.types";
import { BookingCashierQrSection } from "./booking-cashier-qr-section";

function renderSection(
  status: BookingCashierQrSectionProps["state"]["selectedBooking"]["status"],
  paymentStatus: BookingCashierQrSectionProps["state"]["selectedBooking"]["financial"]["paymentStatus"] = "UNPAID",
  qrPaymentIntent: BookingCashierQrSectionProps["state"]["qrPaymentIntent"] = null,
) {
  const props: BookingCashierQrSectionProps = {
    state: {
      selectedBooking: {
        id: "booking-1",
        code: "BK-QA-1",
        date: "2026-10-24",
        type: "SPA",
        source: "WEB",
        spaBookingPromotionEligible: false,
        latePickupFeeAmount: 0,
        latePickupFeePaid: true,
        customer: { name: "QA", phone: "0900000000", loyaltyPointsLabel: "0 điểm", loyaltyPoints: 0 },
        pet: { id: "pet-1", name: "Bông", breed: "Poodle", species: "Chó", weight: 5, age: "2 tuổi", allergies: "" },
        service: { title: "Tắm Spa", category: "Dịch vụ Spa & chăm sóc", assignedStaff: "Chưa phân công", scheduledTime: "09:00 (2026-10-24)", items: [] },
        financial: { subtotal: 250000, discount: 0, finalAmount: 250000, serviceRemainingAmount: 250000, remainingAmount: 250000, paymentStatus },
        status,
        statusV2: status === "READY_FOR_PICKUP" ? "READY_FOR_PICKUP" : "BOOKED",
        startAt: "2026-10-24T02:00:00.000Z",
        parentNotes: "",
      },
      cashierMethod: "VIETQR",
      cashGiven: "",
      isPaidSuccess: false,
      isPaying: false,
      cashierVoucherCode: "",
      cashierVoucherDiscount: 0,
      cashierVoucherError: null,
      isValidatingVoucher: false,
      spaPromotionActive: false,
      spaPromotionEligible: false,
      spaPromotionDiscount: 0,
      effectiveRemaining: 250000,
      pointsToEarn: 25,
      qrPaymentIntent,
      sepayAccount: { channel: "BOOKING", configured: true, bankCode: "MB", bankName: "MBBank", accountNumber: "1234567890", accountName: "PETCARE QA" },
      sepayAccountLoading: false,
      bookingQrImageUrl: qrPaymentIntent?.status === "PENDING" ? "https://example.com/qr.png" : null,
      copiedField: null,
    },
    actions: {
      setCashierMethod: () => {},
      setCashGiven: () => {},
      setCashierVoucherCode: () => {},
      setCashierVoucherError: () => {},
      setCashierVoucherDiscount: () => {},
      onApplyVoucher: () => {},
      onCopyAccount: () => {},
      onCopyTransferInfo: () => {},
      onCreateQrIntent: () => {},
      onCancelQrIntent: () => {},
      onConfirmPayment: () => {},
      onConfirmBankTransfer: () => {},
      onCompleteHandover: () => {},
      onPrintReceipt: () => {},
    },
  };
  return renderToStaticMarkup(<BookingCashierQrSection {...props} />);
}

function renderCreateQrButton(status: BookingCashierQrSectionProps["state"]["selectedBooking"]["status"]) {
  return renderSection(status).match(/<button[^>]*>Tạo mã QR thanh toán<\/button>/)?.[0] ?? "";
}

function createQrButtonIsDisabled(status: BookingCashierQrSectionProps["state"]["selectedBooking"]["status"]) {
  return /\sdisabled(?:=|\s|>)/.test(renderCreateQrButton(status));
}

describe("BookingCashierQrSection", () => {
  it("does not allow creating a QR before the service is ready for pickup", () => {
    expect(createQrButtonIsDisabled("WAITING_CHECKIN")).toBe(true);
  });

  it("allows creating a QR after the service is ready for pickup", () => {
    expect(createQrButtonIsDisabled("READY_FOR_PICKUP")).toBe(false);
  });

  it("does not tell the cashier to create a QR for an already paid booking", () => {
    expect(renderSection("COMPLETED", "PAID")).not.toContain("Có thể tạo mã khi lịch chuyển sang");
  });

  it("offers a manual confirmation fallback while the SePay webhook is pending", () => {
    const pendingQr = {
      id: "intent-1",
      bookingId: "booking-1",
      bookingCode: "BK-QA-1",
      amount: 237500,
      paymentRef: "PCSV12345678",
      transferInfo: "BK-QA-1 PCSV12345678",
      status: "PENDING" as const,
      expiresAt: "2026-10-24T02:15:00.000Z",
      expired: false,
    };
    const markup = renderSection("READY_FOR_PICKUP", "UNPAID", pendingQr);

    expect(markup).toContain("Thanh toán sẽ tự cập nhật khi SePay báo giao dịch thành công.");
    expect(markup).toContain("Xác nhận đã nhận tiền");
  });
});
