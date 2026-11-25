"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface VoucherListFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function VoucherListFilters({ searchQuery, onSearchChange }: VoucherListFiltersProps) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-2xs">
      <div className="relative w-full sm:w-80">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-admin-muted" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo mã voucher, tiêu đề..."
          aria-label="Tìm voucher theo mã hoặc tiêu đề"
          className="h-10 w-full rounded-xl border border-border-subtle bg-admin-muted-surface pl-9 pr-3 text-sm focus-visible:border-admin-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary"
        />
      </div>
    </div>
  );
}
