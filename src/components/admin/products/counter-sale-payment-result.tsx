"use client";

import Image from "next/image";
import { Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { CounterSalePaymentIntent, CounterSaleResult } from "@/hooks/use-orders";

interface CounterSalePaymentResultProps {
  result: CounterSaleResult;
  customerName: string;
  qrImageUrl: string | null;
  paymentIntent: CounterSalePaymentIntent | null;
  cancelling: boolean;
  bankReceivedAmount: string | undefined;
  bankExcessRefunded: boolean;
  confirmingTransfer: boolean;
  onCancelPayment: () => void | Promise<void>;
  onBankReceivedAmountChange: (value: string) => void;
  onBankExcessRefundedChange: (value: boolean) => void;
  onConfirmTransfer: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function formatExpiryDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function CounterSalePaymentResult({
  result,
  customerName,
  qrImageUrl,
  paymentIntent,
  cancelling,
  bankReceivedAmount,
  bankExcessRefunded,
  confirmingTransfer,
  onCancelPayment,
  onBankReceivedAmountChange,
  onBankExcessRefundedChange,
  onConfirmTransfer,
  onOpenChange,
}: CounterSalePaymentResultProps) {
  const paymentExpiry = paymentIntent ? formatExpiryDateTime(paymentIntent.expiresAt) : null;
  const receivedAmount = Number(bankReceivedAmount ?? paymentIntent?.amount ?? result.order.total);
  const hasFractionalReceivedAmount = bankReceivedAmount !== undefined &&
    bankReceivedAmount.trim() !== "" &&
    !Number.isInteger(receivedAmount);

  return (
    <div className="space-y-4 px-5 py-5 sm:px-6">
      <div className="rounded-xl border border-border-subtle bg-admin-muted-surface p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-text">Mã giao dịch</span>
          <span className="font-bold text-admin-primary">{result.order.code}</span>
        </div>
        <div className="mt-2 flex justify-between gap-3">
          <span className="text-muted-text">Khách hàng</span>
          <span className="font-semibold text-ink">{customerName}</span>
        </div>
        <div className="mt-2 flex justify-between gap-3">
          <span className="text-muted-text">Tạm tính</span>
          <span className="font-semibold text-ink">{formatVND(result.order.subtotal)}</span>
        </div>
        {result.order.discount > 0 && (
          <div className="mt-2 flex justify-between gap-3">
            <span className="text-muted-text">Voucher{result.order.voucherUsage?.voucher?.code ? ` (${result.order.voucherUsage.voucher.code})` : ""}</span>
            <span className="font-semibold text-emerald-700">− {formatVND(result.order.discount)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between gap-3">
          <span className="text-muted-text">Cần thanh toán</span>
          <span className="font-bold text-admin-primary">{formatVND(result.order.total)}</span>
        </div>
      </div>

      {paymentIntent?.status === "PENDING" ? (
        <>
          {qrImageUrl ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-admin-qr-border bg-admin-qr-surface p-4 text-center">
              <div className="flex items-center gap-2 text-sm font-bold text-admin-primary">
                <QrCode aria-hidden="true" className="size-4" />
                Quét mã để thanh toán
              </div>
              <Image
                src={qrImageUrl}
                alt={`VietQR giao dịch ${result.order.code}`}
                width={208}
                height={208}
                unoptimized
                className="size-52 rounded-xl border border-border-subtle bg-surface"
              />
              <p className="text-sm text-muted-text">Nội dung chuyển khoản: <strong className="text-ink">{result.transferInfo}</strong></p>
              <p className="max-w-lg text-sm leading-relaxed text-muted-text">Số tiền và nội dung đã điền sẵn. SePay tự xác nhận khi giao dịch khớp; giao dịch cần kiểm tra sẽ xuất hiện trong danh sách đối soát.</p>
              <p className="max-w-lg text-sm leading-relaxed text-muted-text">
                Mã QR có hiệu lực trong 15 phút{paymentExpiry ? `, đến ${paymentExpiry} (giờ Việt Nam)` : ""}. Nếu nhân viên chưa xác nhận đã nhận tiền trong thời gian này, lượng hàng giữ chỗ sẽ được giải phóng. Khoản chuyển đến sau hạn cần liên hệ hỗ trợ.
              </p>
              {result.order.voucherUsage && (
                <p className="max-w-lg text-sm leading-relaxed text-muted-text">Voucher được giữ tạm trong lúc chờ thanh toán; nếu QR hết hạn hoặc bị hủy trước khi trả tiền, quyền dùng voucher sẽ được khôi phục cho khách.</p>
              )}
              <p role="status" className="text-sm font-semibold text-admin-primary">Chờ nhân viên đối chiếu giao dịch trên SePay và xác nhận trong PetCare.</p>
            </div>
          ) : (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Không thể hiển thị mã QR. Kiểm tra cấu hình VietQR và tải lại giao dịch.
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-3">
            <Button type="button" variant="outline" disabled={cancelling} onClick={onCancelPayment} className="h-10">
              {cancelling ? "Đang hủy…" : "Hủy mã QR và nhả hàng"}
            </Button>
          </div>
        </>
      ) : paymentIntent?.status === "COMPLETED" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">Đã nhận thanh toán</p>
          <p className="mt-1 text-sm">Đơn {result.order.code} đã được tất toán và trừ tồn kho.</p>
        </div>
      ) : paymentIntent?.status === "REVIEW" ? (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-950">QR đã hết hạn</p>
          <p className="text-sm leading-relaxed text-amber-900">Lượng hàng giữ chỗ đã được giải phóng. Nếu khách đã chuyển tiền, vui lòng hướng khách liên hệ hỗ trợ.</p>
        </div>
      ) : (
        <div role="status" className="rounded-xl border border-border-subtle bg-admin-muted-surface p-4 text-sm text-muted-text">
          Mã QR đã hết hạn hoặc được hủy; lượng hàng giữ chỗ đã được giải phóng{result.order.voucherUsage ? ", voucher đã được trả lại cho khách" : ""}. Nếu khách đã chuyển tiền, vui lòng hướng khách liên hệ hỗ trợ.
        </div>
      )}

      {paymentIntent?.status === "PENDING" && (
        <div className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4">
          <p className="text-sm leading-relaxed text-muted-text">
            Đối chiếu tiền trên SePay. Chỉ xác nhận khi đã thu đủ; nếu khách chuyển dư, hoàn phần chênh bên ngoài PetCare trước.
          </p>
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="counter-sale-received-amount" className="block w-full text-sm font-semibold text-ink">Tổng tiền đã nhận</label>
            <Input
              id="counter-sale-received-amount"
              type="number"
              className="w-full min-w-0"
              min={0}
              step={1}
              value={bankReceivedAmount ?? String(paymentIntent.amount)}
              onChange={(event) => onBankReceivedAmountChange(event.target.value)}
              aria-invalid={hasFractionalReceivedAmount}
            />
            {hasFractionalReceivedAmount && <p role="alert" className="text-xs text-rose-700">Số tiền đã nhận cần là số nguyên đồng.</p>}
          </div>
          {receivedAmount > paymentIntent.amount && (
            <label className="flex cursor-pointer items-start gap-2 text-sm leading-relaxed text-ink">
              <Checkbox checked={bankExcessRefunded} onCheckedChange={(checked) => onBankExcessRefundedChange(checked === true)} />
              <span>Đã hoàn phần tiền chuyển dư bên ngoài PetCare.</span>
            </label>
          )}
          <Button
            type="button"
            disabled={
              confirmingTransfer ||
              !Number.isInteger(receivedAmount) ||
              receivedAmount < paymentIntent.amount ||
              (receivedAmount > paymentIntent.amount && !bankExcessRefunded)
            }
            onClick={onConfirmTransfer}
            className="h-10 w-full"
          >
            {confirmingTransfer ? <><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Đang xác nhận…</> : "Xác nhận đã nhận đủ tiền"}
          </Button>
        </div>
      )}

      {paymentIntent?.status !== "PENDING" && (
        <div className="flex justify-end border-t border-border-subtle pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
        </div>
      )}
    </div>
  );
}
