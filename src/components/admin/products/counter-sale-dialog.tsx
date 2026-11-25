"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CounterSaleForm } from "@/components/admin/products/counter-sale-form";
import { CounterSalePaymentResult } from "@/components/admin/products/counter-sale-payment-result";
import type { CounterSaleDialogActions, CounterSaleDialogState } from "@/components/admin/products/counter-sale-dialog.types";
import { ShoppingCart } from "lucide-react";

interface CounterSaleDialogProps {
  state: CounterSaleDialogState;
  actions: CounterSaleDialogActions;
}

export function CounterSaleDialog({ state, actions }: CounterSaleDialogProps) {
  return (
    <Dialog open={state.open} onOpenChange={actions.onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[92dvh] max-w-[calc(100%-2rem)] overflow-y-auto border-border-subtle bg-surface p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border-subtle px-5 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-ink">
            <ShoppingCart aria-hidden="true" className="size-5 text-admin-primary" />
            Bán sản phẩm tại quầy
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-text">
            Khách lẻ vẫn mua được. Gắn tài khoản để dùng voucher và tích điểm theo số tiền thực thu; tồn kho được cập nhật sau khi xác nhận thanh toán.
          </DialogDescription>
        </DialogHeader>

        {state.result?.paymentIntent ? (
          <CounterSalePaymentResult
            result={state.result}
            customerName={state.customer?.name ?? "Khách lẻ"}
            qrImageUrl={state.qrImageUrl}
            paymentIntent={state.paymentIntent}
            cancelling={state.cancelling}
            bankReceivedAmount={state.bankReceivedAmount}
            bankExcessRefunded={state.bankExcessRefunded}
            confirmingTransfer={state.confirmingTransfer}
            onCancelPayment={actions.onCancelPayment}
            onBankReceivedAmountChange={actions.onBankReceivedAmountChange}
            onBankExcessRefundedChange={actions.onBankExcessRefundedChange}
            onConfirmTransfer={actions.onConfirmTransfer}
            onOpenChange={actions.onOpenChange}
          />
        ) : (
          <CounterSaleForm state={state} actions={actions} />
        )}
      </DialogContent>
    </Dialog>
  );
}
