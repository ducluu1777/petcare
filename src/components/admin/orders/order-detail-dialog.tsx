"use client";

import { X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Order } from "@/hooks/use-orders";
import { formatAdminOrderAmount, getOrderContact, getOrderWorkflowAction } from "@/lib/admin-order-record";
import { OrderCustomerPaymentSummary, OrderItemsAndTotals } from "@/components/admin/orders/order-detail-summary";

interface OrderDetailDialogProps {
  order: Order | null;
  isUpdating: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: Order["status"], label: string) => void;
  onCancelOrder: (orderId: string, reason: string, goodsReturned: boolean) => Promise<boolean>;
  onRecordRefund: (orderId: string) => Promise<boolean>;
  onConfirmTransfer: (input: { orderId: string; receivedAmount: number; excessRefunded: boolean }) => void | Promise<void>;
}

export function OrderDetailDialog({ order, isUpdating, onClose, onUpdateStatus, onCancelOrder, onRecordRefund, onConfirmTransfer }: OrderDetailDialogProps) {
  const [confirmAction, setConfirmAction] = React.useState<"CANCEL" | "REFUND" | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");
  const [goodsReturned, setGoodsReturned] = React.useState(false);
  const [bankReceivedAmount, setBankReceivedAmount] = React.useState(order ? String(order.total) : "");
  const [bankExcessRefunded, setBankExcessRefunded] = React.useState(false);
  const contact = order ? getOrderContact(order) : null;
  const workflowAction = order ? getOrderWorkflowAction(order) : null;
  const hasRefund = order?.transactions?.some((transaction) => transaction.type === "REFUND") ?? false;
  const canCancel = Boolean(order?.source === "ONLINE" && ["PENDING", "PROCESSING", "READY", "DELIVERY_FAILED"].includes(order.status));
  const canRecordRefund = Boolean(order?.source === "ONLINE" && order.status === "CANCELLED" && order.isPaid && !hasRefund);
  const canConfirmTransfer = Boolean(order?.source === "ONLINE" && order.paymentMethod === "BANK_TRANSFER" && !order.isPaid && order.status !== "CANCELLED");

  const receivedAmount = Number(bankReceivedAmount);
  const hasFractionalReceivedAmount = bankReceivedAmount !== "" && !Number.isInteger(receivedAmount);

  return (
    <Dialog open={!!order} onOpenChange={(open) => { if (!open) { setConfirmAction(null); onClose(); } }}>
      {order && contact && (
        <DialogContent showCloseButton={false} className="max-h-[90dvh] max-w-[calc(100%-2rem)] space-y-4 overflow-y-auto border-border-subtle bg-surface p-6 sm:max-w-lg">
          <DialogHeader className="flex-row items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <span className="text-xs text-admin-muted">Chi tiết đơn hàng</span>
              <DialogTitle className="text-lg font-black text-ink">
                {order.code || `DH-${order.id.slice(0, 6).toUpperCase()}`}
              </DialogTitle>
              <DialogDescription className="sr-only">Thông tin người nhận, sản phẩm và tổng tiền đơn hàng.</DialogDescription>
            </div>
            <Button
              type="button"
              onClick={() => { setConfirmAction(null); onClose(); }}
              variant="ghost"
              size="icon-lg"
              className="rounded-lg text-muted-text hover:bg-admin-muted-surface"
              aria-label="Đóng chi tiết đơn hàng"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <OrderCustomerPaymentSummary order={order} contact={contact} hasRefund={hasRefund} />
            <OrderItemsAndTotals order={order} />
          </div>

          {canConfirmTransfer && order && (
            <section className="space-y-3 rounded-xl border border-admin-qr-border bg-admin-qr-surface p-4" aria-labelledby="order-transfer-confirm-title">
              <div>
                <h3 id="order-transfer-confirm-title" className="text-sm font-bold text-ink">Xác nhận chuyển khoản</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-text">Đối chiếu tiền trên SePay. Chỉ xác nhận khi đã thu đủ; nếu khách chuyển dư, hoàn phần chênh bên ngoài PetCare trước.</p>
              </div>
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="online-order-received-amount" className="block w-full text-sm font-semibold text-ink">Tổng tiền đã nhận</label>
                <Input
                  id="online-order-received-amount"
                  type="number"
                  className="w-full min-w-0"
                  min={0}
                  step={1}
                  value={bankReceivedAmount}
                  onChange={(event) => setBankReceivedAmount(event.target.value)}
                  aria-invalid={hasFractionalReceivedAmount}
                />
                {hasFractionalReceivedAmount && <p role="alert" className="text-xs text-rose-700">Số tiền đã nhận cần là số nguyên đồng.</p>}
              </div>
              {receivedAmount > order.total && (
                <label className="flex cursor-pointer items-start gap-2 text-sm leading-relaxed text-ink">
                  <Checkbox checked={bankExcessRefunded} onCheckedChange={(checked) => setBankExcessRefunded(checked === true)} />
                  <span>Đã hoàn phần tiền chuyển dư bên ngoài PetCare.</span>
                </label>
              )}
              <Button
                type="button"
                disabled={isUpdating || !Number.isInteger(receivedAmount) || receivedAmount < order.total || (receivedAmount > order.total && !bankExcessRefunded)}
                onClick={() => void onConfirmTransfer({ orderId: order.id, receivedAmount, excessRefunded: bankExcessRefunded })}
                className="h-10 w-full text-sm font-semibold"
              >
                Xác nhận đã nhận đủ tiền
              </Button>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-3">
            {order.fulfillmentMethod === "DELIVERY" && order.status === "IN_DELIVERY" && (
              <Button type="button" variant="outline" disabled={isUpdating} onClick={() => onUpdateStatus(order.id, "DELIVERY_FAILED", "Giao thất bại")} className="h-10 rounded-xl border-amber-300 text-amber-900">Giao thất bại</Button>
            )}
            {canCancel && (
              <Button type="button" variant="outline" disabled={isUpdating} onClick={() => setConfirmAction("CANCEL")} className="h-10 rounded-xl border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                Hủy đơn
              </Button>
            )}
            {canRecordRefund && (
              <Button type="button" variant="outline" disabled={isUpdating} onClick={() => setConfirmAction("REFUND")} className="h-10 rounded-xl border-amber-300 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-50">
                Ghi nhận đã hoàn tiền
              </Button>
            )}
            {workflowAction ? (
              <Button
                type="button"
                onClick={() => onUpdateStatus(order.id, workflowAction.status, workflowAction.label)}
                disabled={isUpdating}
                className="h-10 rounded-xl bg-admin-primary px-4 text-sm font-semibold text-white hover:bg-admin-primary-hover"
              >
                {isUpdating ? "Đang cập nhật…" : workflowAction.label}
              </Button>
            ) : order.source === "ONLINE" && order.status === "READY" && !order.isPaid ? (
              <p role="status" className="mr-auto text-sm text-amber-800">Cần thanh toán trước khi xác nhận khách đã nhận hàng.</p>
            ) : null}
            <Button
              type="button"
              onClick={() => { setConfirmAction(null); onClose(); }}
              variant="outline"
              className="h-10 rounded-xl border-border-subtle px-4 text-sm font-semibold text-muted-text hover:bg-admin-muted-surface"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      )}
      {order && confirmAction === "CANCEL" && (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
          <DialogContent role="alertdialog" showCloseButton={false} className="max-w-[calc(100%-2rem)] gap-5 border-border-subtle bg-surface p-5 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-ink">Xác nhận hủy đơn</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-muted-text">
                Hủy đơn sẽ trả hàng về kho và trả voucher. Nếu đơn đã thu tiền, hãy hoàn cả tiền hàng và phí giao ngoài PetCare trước khi ghi nhận hoàn.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label htmlFor="online-order-cancellation-reason" className="text-sm font-semibold text-ink">Lý do hủy <span aria-hidden="true">*</span></label>
              <Textarea
                id="online-order-cancellation-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
                placeholder="Ví dụ: khách yêu cầu hủy trước khi nhận hàng"
                aria-required="true"
              />
            </div>
            {order.status === "DELIVERY_FAILED" && <label className="flex items-start gap-2 text-sm"><Checkbox checked={goodsReturned} onCheckedChange={(checked) => setGoodsReturned(checked === true)} /><span>Tôi xác nhận hàng đã được mang về cửa hàng trước khi trả tồn kho.</span></label>}
            <DialogFooter className="-mx-5 -mb-5 flex-row justify-end gap-2 px-5 py-3">
              <Button type="button" variant="outline" disabled={isUpdating} onClick={() => setConfirmAction(null)} className="h-10 px-4">Quay lại</Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isUpdating || !cancelReason.trim() || (order.status === "DELIVERY_FAILED" && !goodsReturned)}
                onClick={async () => {
                  if (await onCancelOrder(order.id, cancelReason.trim(), goodsReturned)) {
                    setConfirmAction(null);
                    setCancelReason("");
                    setGoodsReturned(false);
                  }
                }}
                className="h-10 px-4"
              >
                {isUpdating ? "Đang xử lý..." : "Hủy đơn hàng"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {order && confirmAction === "REFUND" && (
        <AdminConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
          title="Xác nhận đã hoàn tiền"
          description={`Ghi nhận đã hoàn ${formatAdminOrderAmount(order.total)} cho đơn ${order.code}. Chỉ tiếp tục nếu tiền đã được chuyển cho khách.`}
          confirmLabel="Đã chuyển tiền, ghi nhận hoàn"
          isPending={isUpdating}
          onConfirm={async () => {
            if (await onRecordRefund(order.id)) setConfirmAction(null);
          }}
        />
      )}
    </Dialog>
  );
}
