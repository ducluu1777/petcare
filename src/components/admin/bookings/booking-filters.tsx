"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const BOOKING_STATUS_FILTERS = [
  "ALL",
  "WAITING_CHECKIN",
  "ARRIVED",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "CANCELLED_OR_NO_SHOW",
] as const;

export type BookingStatusFilter = typeof BOOKING_STATUS_FILTERS[number];

const STATUS_FILTER_LABELS: Record<BookingStatusFilter, string> = {
  ALL: "Tất cả",
  WAITING_CHECKIN: "Đã đặt",
  ARRIVED: "Đã tiếp nhận",
  IN_PROGRESS: "Đang chăm sóc",
  READY_FOR_PICKUP: "Chờ khách nhận",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không đến",
  CANCELLED_OR_NO_SHOW: "Hủy / không đến",
};

type BookingFiltersProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  statusFilter: BookingStatusFilter;
  onStatusFilterChange: (filter: BookingStatusFilter) => void;
  total: number;
};

export function BookingFilters({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  total,
}: BookingFiltersProps) {
  return (
    <section aria-label="Tìm và lọc lịch hẹn" className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs">
      <div className="relative w-full lg:max-w-md">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-text" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Tìm mã lịch, khách, số điện thoại hoặc thú cưng"
          aria-label="Tìm lịch theo mã, khách hàng, số điện thoại hoặc thú cưng"
          className="h-10 bg-slate-50 pl-9 pr-9 text-sm hover:bg-slate-100/80 focus:bg-surface"
        />
        {searchQuery && (
          <Button
            type="button"
            onClick={() => onSearchQueryChange("")}
            variant="ghost"
            size="icon"
            aria-label="Xóa từ khóa tìm kiếm"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-text hover:text-ink"
          >
            <X aria-hidden="true" className="size-3.5" />
          </Button>
        )}
      </div>

      <div role="group" aria-label="Lọc theo tình trạng lịch" className="flex items-center gap-2 overflow-x-auto pt-1 text-sm">
        <span aria-hidden="true" className="shrink-0 text-sm font-medium text-muted-text">Tình trạng:</span>
        {BOOKING_STATUS_FILTERS.map((filter) => (
          <Button
            type="button"
            key={filter}
            onClick={() => onStatusFilterChange(filter)}
            aria-pressed={statusFilter === filter}
            variant={statusFilter === filter ? "default" : "outline"}
            className={`h-10 shrink-0 rounded-md px-2.5 text-sm font-medium ${
              statusFilter === filter
                ? "border-primary bg-primary font-bold text-surface shadow-xs"
                : "border-border-subtle bg-surface text-muted-text hover:bg-slate-100 hover:text-ink"
            }`}
          >
            {STATUS_FILTER_LABELS[filter]}
          </Button>
        ))}
        <span className="ml-auto shrink-0 tabular-nums text-muted-text">{total} lịch</span>
      </div>
      <span className="sr-only" role="status" aria-live="polite">Đang lọc lịch: {STATUS_FILTER_LABELS[statusFilter]}</span>
    </section>
  );
}
