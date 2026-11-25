import { Banknote, ChevronRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { TransactionRecord } from "@/lib/admin-transaction-record";

interface TransactionTableRowProps {
  transaction: TransactionRecord;
  onOpenDetail: (transaction: TransactionRecord) => void;
}

export function TransactionTableRow({ transaction, onOpenDetail }: TransactionTableRowProps) {
  const typeLabel = transaction.type === "DEPOSIT"
    ? "Đặt cọc (lịch sử)"
    : transaction.type === "FINAL_PAYMENT"
      ? "Thanh toán"
      : transaction.type === "REFUND"
        ? "Hoàn tiền"
        : "Phụ phí";

  return (
    <TableRow className="group border-border-subtle transition-colors hover:bg-slate-50">
      <TableCell className="py-3.5 text-sm font-bold text-ink">{transaction.referenceCode}</TableCell>
      <TableCell className="py-3.5 text-sm font-semibold text-primary">{transaction.relatedCode}</TableCell>
      <TableCell className="py-3.5">
        <p className="text-sm font-bold text-ink">{transaction.customerName}</p>
        <span className="mt-0.5 block text-xs text-muted-text">{transaction.contentDescription}</span>
      </TableCell>
      <TableCell className="py-3.5">
        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${
          transaction.type === "FINAL_PAYMENT"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : transaction.type === "REFUND"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {typeLabel}
        </span>
      </TableCell>
      <TableCell className="py-3.5">
        <div className="flex items-center gap-1.5 text-sm text-slate-700">
          {transaction.method === "VIETQR"
            ? <QrCode aria-hidden="true" className="size-3.5 text-primary" />
            : <Banknote aria-hidden="true" className="size-3.5 text-emerald-700" />}
          <span>{transaction.method === "VIETQR" ? "Chuyển khoản QR" : "Tiền mặt"}</span>
        </div>
      </TableCell>
      <TableCell className={`py-3.5 text-sm font-bold tabular-nums ${transaction.type === "REFUND" ? "text-rose-700" : "text-ink"}`}>
        {transaction.type === "REFUND" ? "−" : "+"} {transaction.amount.toLocaleString("vi-VN")}₫
      </TableCell>
      <TableCell className="py-3.5">
        <div className="text-xs text-slate-700">{transaction.transactedAt}</div>
        <div className="mt-0.5 text-xs text-muted-text">{transaction.sourceLabel}</div>
      </TableCell>
      <TableCell className="py-3.5 text-right">
        <Button
          type="button"
          onClick={() => onOpenDetail(transaction)}
          variant="outline"
          size="icon"
          className="size-10 rounded-lg border-border-subtle text-muted-text hover:bg-slate-100 hover:text-ink"
          aria-label={`Xem chứng từ giao dịch ${transaction.referenceCode}`}
          title="Xem chi tiết giao dịch"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
