"use client";

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { TransactionRecord } from "@/lib/admin-transaction-record";

interface TransactionDetailSheetProps {
  transaction: TransactionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailSheet({ transaction, open, onOpenChange }: TransactionDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] sm:w-[750px] max-w-[95vw] bg-slate-50 border-l border-border-subtle p-0 flex flex-col h-dvh max-h-dvh shadow-2xl z-50">
        {transaction && (
          <>
            <SheetHeader className="p-6 border-b border-border-subtle bg-surface shrink-0">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs bg-slate-100 font-bold">
                  {transaction.referenceCode}
                </Badge>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border flex items-center gap-1 ${
                  transaction.type === "REFUND" || transaction.type === "DEPOSIT"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : transaction.method === "VIETQR"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                }`}>
                  <CheckCircle2 aria-hidden="true" className="w-3 h-3" />
                  <span>{transaction.type === "DEPOSIT" ? "Đặt cọc (lịch sử)" : transaction.type === "REFUND" ? "Khoản hoàn tiền" : transaction.method === "VIETQR" ? "Đã xác nhận chuyển khoản" : "Đã ghi nhận"}</span>
                </span>
              </div>
              <SheetTitle className="text-xl font-bold text-ink mt-2">
                Chi tiết giao dịch: {transaction.amount.toLocaleString("vi-VN")}₫
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-text">
                Tham chiếu: <strong>{transaction.relatedCode}</strong>
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              <section aria-labelledby="transaction-details-heading" className="bg-surface p-4 rounded-xl border border-border-subtle shadow-xs space-y-2.5">
                <h3 id="transaction-details-heading" className="block font-semibold text-slate-700">Thông tin giao dịch</h3>
                <div className="space-y-1.5 text-slate-800">
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-muted-text font-sans">Mã giao dịch đại diện:</span>
                    <strong className="break-all text-right text-ink">{transaction.referenceCode}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-muted-text font-sans">Mã lịch / đơn hàng:</span>
                    <strong className="text-primary">{transaction.relatedCode}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-muted-text font-sans">Thời gian ghi nhận:</span>
                    <span>{transaction.transactedAt}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-muted-text font-sans">Hình thức thanh toán:</span>
                    <strong className="text-ink font-sans">
                      {transaction.type === "REFUND"
                        ? transaction.method === "VIETQR" ? "Chuyển khoản hoàn tiền" : "Hoàn tiền tại quầy"
                        : transaction.method === "VIETQR" ? "Chuyển khoản ngân hàng" : "Tiền mặt tại quầy"}
                    </strong>
                  </div>
                  {transaction.receivedAmount !== null && transaction.receivedAmount !== undefined && (
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-muted-text font-sans">Số tiền nhận thực tế:</span>
                      <strong className="text-ink">{transaction.receivedAmount.toLocaleString("vi-VN")}₫</strong>
                    </div>
                  )}
                  {transaction.confirmedByName && (
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-muted-text font-sans">Người xác nhận:</span>
                      <strong className="text-ink">{transaction.confirmedByName}</strong>
                    </div>
                  )}
                  {transaction.note && <p className="break-words border-b border-border-subtle py-1 text-muted-text">{transaction.note}</p>}
                  <div className="flex justify-between py-1">
                    <span className="text-muted-text font-sans">Nguồn giao dịch:</span>
                    <span className="font-sans">{transaction.sourceLabel}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-text font-sans">Cách ghi nhận:</span>
                    <span className="font-sans">{transaction.recordSource}</span>
                  </div>
                  {transaction.proofUrl && (
                    <div className="flex justify-between gap-3 py-1">
                      <span className="text-muted-text font-sans">Chứng từ:</span>
                      <a href={transaction.proofUrl} target="_blank" rel="noreferrer" className="rounded-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary focus-visible:ring-offset-2">Mở chứng từ</a>
                    </div>
                  )}
                </div>
              </section>

              <section aria-labelledby="transaction-customer-heading" className="bg-surface p-4 rounded-xl border border-border-subtle shadow-xs space-y-2">
                <h3 id="transaction-customer-heading" className="block font-semibold text-slate-700">Khách hàng & nội dung giao dịch</h3>
                <p className="text-ink font-semibold">{transaction.customerName}</p>
                <p className="text-muted-text">{transaction.contentDescription}</p>
              </section>
            </div>

            <div className="p-5 border-t border-border-subtle bg-surface shrink-0 flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="h-10 rounded-lg border-border-subtle px-4 text-sm font-semibold hover:bg-slate-100"
              >
                Đóng
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
