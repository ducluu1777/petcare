import type { FormEvent } from "react";
import type { Product } from "@/hooks/use-products";
import type { UserListItem } from "@/hooks/use-users";
import type { CounterSalePaymentIntent, CounterSaleResult } from "@/hooks/use-orders";
import type { VoucherItem } from "@/hooks/use-vouchers";

export type CounterSaleLine = { product: Product; quantity: number };

export interface CounterSaleDialogState {
  open: boolean;
  result: CounterSaleResult | null;
  customer: UserListItem | null;
  subtotal: number;
  discount: number;
  total: number;
  vouchers: VoucherItem[];
  vouchersLoading: boolean;
  vouchersError: boolean;
  selectedVoucher: VoucherItem | null;
  selectedVoucherCode: string;
  qrImageUrl: string | null;
  paymentIntent: CounterSalePaymentIntent | null;
  cancelling: boolean;
  productSearch: string;
  products: Product[];
  productsLoading: boolean;
  productsError: boolean;
  quantities: Record<string, number>;
  selectedLines: CounterSaleLine[];
  customerPhone: string;
  customerSearchLoading: boolean;
  customerMatches: UserListItem[];
  paymentMethod: "CASH" | "BANK_TRANSFER";
  qrAccountLoading: boolean;
  qrConfigured: boolean;
  creating: boolean;
  bankReceivedAmount: string | undefined;
  bankExcessRefunded: boolean;
  confirmingTransfer: boolean;
}

export interface CounterSaleDialogActions {
  onOpenChange: (open: boolean) => void;
  onProductSearchChange: (value: string) => void;
  onRetryProducts: () => void;
  onQuantityChange: (product: Product, delta: number) => void;
  onCustomerPhoneChange: (value: string) => void;
  onSelectCustomer: (customer: UserListItem) => void;
  onRemoveCustomer: () => void;
  onVoucherChange: (code: string) => void;
  onRetryVouchers: () => void;
  onPaymentMethodChange: (method: "CASH" | "BANK_TRANSFER") => void;
  onCancelPayment: () => void;
  onBankReceivedAmountChange: (value: string) => void;
  onBankExcessRefundedChange: (value: boolean) => void;
  onConfirmTransfer: () => void | Promise<void>;
  onSubmit: (event: FormEvent) => void | Promise<void>;
}
