"use client";

import * as React from "react";
import { toast } from "sonner";
import { useSearchUserByPhone, type UserListItem } from "@/hooks/use-users";
import {
  useCancelCounterSalePaymentIntent,
  useConfirmCounterSaleTransfer,
  useCounterSalePaymentIntent,
  useCreateCounterSale,
  type CounterSaleResult,
} from "@/hooks/use-orders";
import { useCustomerVouchers, type VoucherItem } from "@/hooks/use-vouchers";
import { useSepayAccountConfig } from "@/hooks/use-payment-config";
import { useAdminProducts, type Product } from "@/hooks/use-products";
import { buildVietQrImageUrl } from "@/lib/payment-qr";
import { VOUCHER_UNAVAILABLE_MESSAGE } from "@/lib/voucher-messages";

type UseCounterSaleWorkflowOptions = {
  onInventoryChange: () => Promise<void>;
};

export function useCounterSaleWorkflow({ onInventoryChange }: UseCounterSaleWorkflowOptions) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [productSearch, setProductSearch] = React.useState("");
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});
  const [productSnapshots, setProductSnapshots] = React.useState<Record<string, Product>>({});
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customer, setCustomer] = React.useState<UserListItem | null>(null);
  const [voucherCode, setVoucherCode] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [result, setResult] = React.useState<CounterSaleResult | null>(null);
  const [bankReceivedAmount, setBankReceivedAmount] = React.useState<string | undefined>(undefined);
  const [bankExcessRefunded, setBankExcessRefunded] = React.useState(false);

  const productsQuery = useAdminProducts({
    search: productSearch.trim() || undefined,
    isActive: true,
    page: 1,
    limit: 50,
    enabled: isOpen && !result,
  });
  const customerSearchQuery = useSearchUserByPhone(customerPhone.trim());
  const customerVouchersQuery = useCustomerVouchers(customer?.id);
  const refetchCustomerVouchers = customerVouchersQuery.refetch;
  const orderQrAccountQuery = useSepayAccountConfig("ORDER");
  const createCounterSale = useCreateCounterSale();
  const confirmCounterSaleTransfer = useConfirmCounterSaleTransfer();
  const cancelCounterSalePayment = useCancelCounterSalePaymentIntent();
  const paymentIntentQuery = useCounterSalePaymentIntent(
    result?.paymentIntent?.id,
    isOpen && !!result?.paymentIntent,
  );

  const livePaymentIntent = paymentIntentQuery.data ?? result?.paymentIntent ?? null;
  const qrImageUrl = result?.transferInfo
    ? buildVietQrImageUrl(orderQrAccountQuery.data, result.order.total, result.transferInfo)
    : null;

  React.useEffect(() => {
    if (!result?.paymentIntent || !["COMPLETED", "CANCELLED"].includes(livePaymentIntent?.status ?? "")) return;
    void onInventoryChange();
  }, [livePaymentIntent?.status, onInventoryChange, result]);

  React.useEffect(() => {
    if (!result?.order.voucherUsage || livePaymentIntent?.status !== "CANCELLED") return;
    void refetchCustomerVouchers();
  }, [livePaymentIntent?.status, refetchCustomerVouchers, result]);

  const products: Product[] = productsQuery.data?.data ?? [];
  const selectedLines = Object.entries(quantities)
    .map(([productId, quantity]) => ({ product: productSnapshots[productId], quantity }))
    .filter((line): line is { product: Product; quantity: number } => !!line.product && line.quantity > 0);
  const subtotal = selectedLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const vouchers: VoucherItem[] = customerVouchersQuery.data ?? [];
  const selectedVoucher = vouchers.find((voucher) => voucher.code === voucherCode) ?? null;
  const discount = selectedVoucher && selectedVoucher.minSpend <= subtotal
    ? Math.min(
      subtotal,
      selectedVoucher.discountType === "PERCENTAGE"
        ? Math.min(
          Math.round(subtotal * selectedVoucher.discountValue / 100),
          selectedVoucher.maxDiscount || Number.MAX_SAFE_INTEGER,
        )
        : selectedVoucher.discountValue,
    )
    : 0;
  const total = Math.max(0, subtotal - discount);

  const open = () => {
    setProductSearch("");
    setQuantities({});
    setProductSnapshots({});
    setCustomerPhone("");
    setCustomer(null);
    setVoucherCode("");
    setPaymentMethod("CASH");
    setResult(null);
    setBankReceivedAmount(undefined);
    setBankExcessRefunded(false);
    setIsOpen(true);
  };

  const close = (nextOpen: boolean) => {
    if (!nextOpen && livePaymentIntent?.status === "PENDING") return;
    setIsOpen(nextOpen);
    if (!nextOpen) {
      setResult(null);
      setQuantities({});
      setProductSnapshots({});
      setVoucherCode("");
    }
  };

  const updateQuantity = (product: Product, delta: number) => {
    const available = Math.max(0, product.stock - (product.reservedStock ?? 0));
    const nextQuantity = Math.max(0, Math.min(available, (quantities[product.id] ?? 0) + delta));
    if (nextQuantity === 0) {
      const nextQuantities = { ...quantities };
      const nextSnapshots = { ...productSnapshots };
      delete nextQuantities[product.id];
      delete nextSnapshots[product.id];
      setQuantities(nextQuantities);
      setProductSnapshots(nextSnapshots);
      return;
    }
    setProductSnapshots({ ...productSnapshots, [product.id]: product });
    setQuantities({ ...quantities, [product.id]: nextQuantity });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedLines.length === 0) {
      toast.error("Thêm ít nhất một sản phẩm vào giao dịch.");
      return;
    }
    if (voucherCode && !selectedVoucher) {
      toast.error(VOUCHER_UNAVAILABLE_MESSAGE);
      return;
    }
    if (selectedVoucher && selectedVoucher.minSpend > subtotal) {
      toast.error(`Đơn cần đạt ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(selectedVoucher.minSpend)} để áp dụng voucher.`);
      return;
    }
    if (selectedVoucher && total <= 0) {
      toast.error("Không thể áp dụng voucher vì số tiền phải thu sẽ còn 0đ. Chọn voucher khác hoặc bỏ voucher.");
      return;
    }
    try {
      const created = await createCounterSale.mutateAsync({
        items: selectedLines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        customerId: customer?.id,
        voucherCode: voucherCode || undefined,
        paymentMethod,
      });
      if (created.paymentIntent) {
        setResult(created);
        setBankReceivedAmount(String(created.paymentIntent.amount));
        toast.success("Đã tạo mã QR và giữ số lượng trong 15 phút.");
      } else {
        toast.success("Đã ghi nhận giao dịch bán tại quầy.");
        setIsOpen(false);
        setQuantities({});
        setProductSnapshots({});
        setVoucherCode("");
        setResult(null);
        await onInventoryChange();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo giao dịch bán tại quầy.");
    }
  };

  const confirmTransfer = async () => {
    const intent = livePaymentIntent;
    if (!intent) return;
    const receivedAmount = Number(bankReceivedAmount ?? intent.amount);
    if (!Number.isInteger(receivedAmount) || receivedAmount < intent.amount) {
      toast.error("Tổng tiền đã nhận chưa đủ số tiền hóa đơn.");
      return;
    }
    if (receivedAmount > intent.amount && !bankExcessRefunded) {
      toast.error("Hoàn phần tiền chuyển dư bên ngoài PetCare trước khi xác nhận.");
      return;
    }
    try {
      const confirmed = await confirmCounterSaleTransfer.mutateAsync({
        intentId: intent.id,
        receivedAmount,
        excessRefunded: bankExcessRefunded,
      });
      const refreshed = await paymentIntentQuery.refetch();
      if (refreshed.data) {
        setResult((current) => current ? { ...current, paymentIntent: refreshed.data } : current);
      }
      if ("requiresSupport" in confirmed) {
        toast.error("Mã QR đã hết hạn và lượng hàng giữ chỗ đã được giải phóng. Vui lòng hướng khách liên hệ hỗ trợ.");
      } else {
        toast.success("Đã xác nhận thanh toán và trừ tồn cho giao dịch " + confirmed.code + ".");
      }
      await onInventoryChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xác nhận khoản chuyển.");
    }
  };

  const cancelPayment = async () => {
    const intentId = livePaymentIntent?.id;
    if (!intentId) return;
    try {
      const cancelled = await cancelCounterSalePayment.mutateAsync(intentId);
      setResult((current) => current ? { ...current, paymentIntent: cancelled } : current);
      toast.success("Đã hủy mã QR, nhả hàng và khôi phục voucher cho khách (nếu có).");
      await onInventoryChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể hủy mã QR.");
    }
  };

  return {
    open,
    state: {
      open: isOpen,
      result,
      customer,
      subtotal,
      discount,
      total,
      vouchers,
      vouchersLoading: customerVouchersQuery.isLoading,
      vouchersError: customerVouchersQuery.isError,
      selectedVoucher,
      selectedVoucherCode: voucherCode,
      qrImageUrl,
      paymentIntent: livePaymentIntent,
      cancelling: cancelCounterSalePayment.isPending,
      productSearch,
      products,
      productsLoading: productsQuery.isLoading,
      productsError: productsQuery.isError,
      quantities,
      selectedLines,
      customerPhone,
      customerSearchLoading: customerSearchQuery.isLoading,
      customerMatches: customerSearchQuery.data ?? [],
      paymentMethod,
      qrAccountLoading: orderQrAccountQuery.isLoading,
      qrConfigured: !!orderQrAccountQuery.data?.configured,
      creating: createCounterSale.isPending,
      bankReceivedAmount,
      bankExcessRefunded,
      confirmingTransfer: confirmCounterSaleTransfer.isPending,
    },
    actions: {
      onOpenChange: close,
      onProductSearchChange: setProductSearch,
      onRetryProducts: () => { void productsQuery.refetch(); },
      onQuantityChange: updateQuantity,
      onCustomerPhoneChange: setCustomerPhone,
      onSelectCustomer: (nextCustomer: UserListItem) => {
        setCustomer(nextCustomer);
        setCustomerPhone(nextCustomer.phone || "");
        setVoucherCode("");
      },
      onRemoveCustomer: () => {
        setCustomer(null);
        setCustomerPhone("");
        setVoucherCode("");
      },
      onVoucherChange: setVoucherCode,
      onRetryVouchers: () => { void customerVouchersQuery.refetch(); },
      onPaymentMethodChange: setPaymentMethod,
      onCancelPayment: cancelPayment,
      onBankReceivedAmountChange: setBankReceivedAmount,
      onBankExcessRefundedChange: setBankExcessRefunded,
      onConfirmTransfer: confirmTransfer,
      onSubmit: submit,
    },
  };
}
