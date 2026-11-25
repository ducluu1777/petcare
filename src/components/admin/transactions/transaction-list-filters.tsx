"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, QrCode, Search } from "lucide-react";
import type { TransactionSource } from "@/lib/admin-transaction-record";

export type TransactionMethodFilter = "ALL" | "VIETQR" | "CASH";
export type TransactionSourceFilter = "ALL" | TransactionSource;

interface TransactionListFiltersProps {
  methodFilter: TransactionMethodFilter;
  sourceFilter: TransactionSourceFilter;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  hasInvalidDateRange: boolean;
  allCount: number | null;
  qrCount: number | null;
  cashCount: number | null;
  sourceCounts: Record<TransactionSourceFilter, number> | null;
  onMethodChange: (method: TransactionMethodFilter) => void;
  onSourceChange: (source: TransactionSourceFilter) => void;
  onSearchChange: (query: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
}

export function TransactionListFilters({
  methodFilter,
  sourceFilter,
  searchQuery,
  dateFrom,
  dateTo,
  hasInvalidDateRange,
  allCount,
  qrCount,
  cashCount,
  sourceCounts,
  onMethodChange,
  onSourceChange,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
}: TransactionListFiltersProps) {
  const countLabel = (count: number | null) => count === null ? "—" : count;

  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs xl:flex-row xl:items-end">
      <div role="group" aria-label="Lọc giao dịch theo hình thức thanh toán" className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-border-subtle bg-slate-100 p-1">
        <Button
          type="button"
          size="sm"
          variant={methodFilter === "ALL" ? "secondary" : "ghost"}
          aria-pressed={methodFilter === "ALL"}
          onClick={() => onMethodChange("ALL")}
          className={`h-10 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-all ${
            methodFilter === "ALL" ? "bg-surface font-bold text-primary shadow-xs" : "text-muted-text hover:text-ink"
          }`}
        >
          Tất cả hình thức ({countLabel(allCount)})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={methodFilter === "VIETQR" ? "secondary" : "ghost"}
          aria-pressed={methodFilter === "VIETQR"}
          onClick={() => onMethodChange("VIETQR")}
          className={`h-10 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-all ${
            methodFilter === "VIETQR" ? "bg-surface font-bold text-primary shadow-xs" : "text-muted-text hover:text-ink"
          }`}
        >
          <QrCode aria-hidden="true" className="size-3.5" />
          <span>Chuyển khoản QR ({countLabel(qrCount)})</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={methodFilter === "CASH" ? "secondary" : "ghost"}
          aria-pressed={methodFilter === "CASH"}
          onClick={() => onMethodChange("CASH")}
          className={`h-10 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-all ${
            methodFilter === "CASH" ? "bg-surface font-bold text-primary shadow-xs" : "text-muted-text hover:text-ink"
          }`}
        >
          <Banknote aria-hidden="true" className="size-3.5" />
          <span>Tiền mặt ({countLabel(cashCount)})</span>
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(180px,1fr)_minmax(220px,1.4fr)]">
          <label htmlFor="transaction-date-from" className="block min-w-0 text-sm font-semibold text-muted-text">
            Từ ngày
            <Input
              id="transaction-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              aria-invalid={hasInvalidDateRange}
              onChange={(event) => onDateFromChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border-border-subtle bg-slate-50 px-2.5 text-sm text-ink focus:bg-surface"
            />
          </label>
          <label htmlFor="transaction-date-to" className="block min-w-0 text-sm font-semibold text-muted-text">
            Đến ngày
            <Input
              id="transaction-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              aria-invalid={hasInvalidDateRange}
              onChange={(event) => onDateToChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border-border-subtle bg-slate-50 px-2.5 text-sm text-ink focus:bg-surface"
            />
          </label>
          <div className="min-w-0">
            <label htmlFor="transaction-source" className="mb-1 block text-sm font-semibold text-muted-text">Nguồn giao dịch</label>
            <Select
              items={{
                ALL: `Tất cả nguồn (${countLabel(sourceCounts?.ALL ?? null)})`,
                BOOKING: `Lịch dịch vụ (${countLabel(sourceCounts?.BOOKING ?? null)})`,
                ONLINE_ORDER: `Đơn online (${countLabel(sourceCounts?.ONLINE_ORDER ?? null)})`,
                IN_STORE: `Bán tại quầy (${countLabel(sourceCounts?.IN_STORE ?? null)})`,
                OTHER: `Khác (${countLabel(sourceCounts?.OTHER ?? null)})`,
              }}
              value={sourceFilter} onValueChange={(value) => { if (value) onSourceChange(value as TransactionSourceFilter); }}>
              <SelectTrigger id="transaction-source" className="h-10 w-full rounded-lg border-border-subtle bg-slate-50 text-sm text-ink" aria-label="Lọc giao dịch theo nguồn">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả nguồn ({countLabel(sourceCounts?.ALL ?? null)})</SelectItem>
                <SelectItem value="BOOKING">Lịch dịch vụ ({countLabel(sourceCounts?.BOOKING ?? null)})</SelectItem>
                <SelectItem value="ONLINE_ORDER">Đơn online ({countLabel(sourceCounts?.ONLINE_ORDER ?? null)})</SelectItem>
                <SelectItem value="IN_STORE">Bán tại quầy ({countLabel(sourceCounts?.IN_STORE ?? null)})</SelectItem>
                <SelectItem value="OTHER">Khác ({countLabel(sourceCounts?.OTHER ?? null)})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
            <label htmlFor="transaction-search" className="mb-1 block text-sm font-semibold text-muted-text">Tìm giao dịch</label>
            <Search aria-hidden="true" className="absolute left-3.5 top-10 size-4 -translate-y-1/2 text-muted-text" />
            <Input
              id="transaction-search"
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Mã giao dịch, lịch/đơn, tên khách"
              className="h-10 rounded-lg border-border-subtle bg-slate-50 pl-9 text-sm text-ink hover:bg-slate-100/80 focus:bg-surface"
            />
          </div>
        </div>
        {hasInvalidDateRange && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-700">Ngày bắt đầu phải trước hoặc cùng ngày kết thúc.</p>
        )}
      </div>
    </div>
  );
}
