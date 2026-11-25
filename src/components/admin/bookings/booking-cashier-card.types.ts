import type { BookingQrPaymentIntent } from "@/hooks/use-transactions";
import type { SepayAccountConfig } from "@/hooks/use-payment-config";
import type { BookingRecord } from "@/lib/admin-booking-record";

export type CashierMethod = "VIETQR" | "CASH";
export type CopiedPaymentField = "account" | "code" | null;

export interface BookingCashierState {
  selectedBooking: BookingRecord;
  cashierMethod: CashierMethod;
  cashGiven: string;
  isPaidSuccess: boolean;
  isPaying: boolean;
  cashierVoucherCode: string;
  cashierVoucherDiscount: number;
  cashierVoucherError: string | null;
  isValidatingVoucher: boolean;
  spaPromotionActive: boolean;
  spaPromotionEligible: boolean;
  spaPromotionDiscount: number;
  effectiveRemaining: number;
  pointsToEarn: number;
  qrPaymentIntent: BookingQrPaymentIntent | null;
  sepayAccount: SepayAccountConfig | undefined;
  sepayAccountLoading: boolean;
  bookingQrImageUrl: string | null;
  copiedField: CopiedPaymentField;
}

export interface BookingCashierActions {
  setCashierMethod: (method: CashierMethod) => void;
  setCashGiven: (value: string) => void;
  setCashierVoucherCode: (value: string) => void;
  setCashierVoucherError: (value: string | null) => void;
  setCashierVoucherDiscount: (value: number) => void;
  onApplyVoucher: () => void | Promise<void>;
  onCopyAccount: () => void;
  onCopyTransferInfo: () => void;
  onCreateQrIntent: () => void;
  onCancelQrIntent: () => void;
  onConfirmPayment: () => void;
  onConfirmBankTransfer: () => void;
  onCompleteHandover: () => void;
  onPrintReceipt: () => void;
}

export interface BookingCashierCardProps {
  state: BookingCashierState;
  actions: BookingCashierActions;
}

export type BookingCashierQrSectionProps = BookingCashierCardProps;
