"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type OrderStatusFilter = "ALL" | "OVERDUE" | "PENDING" | "PROCESSING" | "READY" | "IN_DELIVERY" | "DELIVERY_FAILED" | "COMPLETED" | "CANCELLED";

interface OrderListFiltersProps {
  searchQuery: string;
  selectedStatus: OrderStatusFilter;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: OrderStatusFilter) => void;
}

const statuses: { id: OrderStatusFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "OVERDUE", label: "Quá hạn thanh toán" },
  { id: "PENDING", label: "Chờ xử lý" },
  { id: "PROCESSING", label: "Đang xử lý" },
  { id: "READY", label: "Sẵn sàng" },
  { id: "IN_DELIVERY", label: "Đang giao" },
  { id: "DELIVERY_FAILED", label: "Giao thất bại" },
  { id: "COMPLETED", label: "Hoàn tất" },
  { id: "CANCELLED", label: "Đã hủy" },
];

export function OrderListFilters({ searchQuery, selectedStatus, onSearchChange, onStatusChange }: OrderListFiltersProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-2xs sm:flex-row">
      <div className="relative w-full sm:w-80">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-admin-muted" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo mã đơn, người nhận, số điện thoại..."
          aria-label="Tìm đơn theo mã đơn, người nhận hoặc số điện thoại"
          className="h-10 rounded-lg border-border-subtle bg-admin-muted-surface pl-9 pr-3 text-sm focus:bg-surface"
        />
      </div>
      <div
        role="group"
        aria-label="Lọc đơn hàng theo trạng thái"
        className="flex w-full items-center gap-1.5 overflow-x-auto sm:w-auto"
      >
        {statuses.map((status) => (
          <Button
            key={status.id}
            type="button"
            variant={selectedStatus === status.id ? "default" : "outline"}
            size="sm"
            aria-pressed={selectedStatus === status.id}
            onClick={() => onStatusChange(status.id)}
            className={`h-10 shrink-0 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${
              selectedStatus === status.id
                ? "bg-admin-primary text-white hover:bg-admin-primary-hover"
                : "border-border-subtle bg-admin-muted-surface text-muted-text hover:bg-surface hover:text-ink"
            }`}
          >
            {status.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
