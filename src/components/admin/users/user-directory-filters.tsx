"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type UserDirectoryRoleFilter = "ALL" | "CUSTOMER" | "STAFF" | "ADMIN";

interface UserDirectoryFiltersProps {
  searchTerm: string;
  roleFilter: UserDirectoryRoleFilter;
  onSearchTermChange: (value: string) => void;
  onRoleFilterChange: (value: UserDirectoryRoleFilter) => void;
}

const roleOptions: { key: UserDirectoryRoleFilter; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "CUSTOMER", label: "Khách hàng" },
  { key: "STAFF", label: "Nhân viên" },
  { key: "ADMIN", label: "Quản trị viên" },
];

export function UserDirectoryFilters({
  searchTerm,
  roleFilter,
  onSearchTermChange,
  onRoleFilterChange,
}: UserDirectoryFiltersProps) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-3.5 shadow-2xs sm:flex-row sm:items-center">
      <div className="relative max-w-md flex-1">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
          aria-label="Tìm tài khoản theo tên, email hoặc số điện thoại"
          className="h-10 rounded-lg border-border-subtle bg-slate-50 pl-9 text-sm text-ink hover:bg-slate-100/70 focus:bg-surface"
        />
      </div>

      <div role="group" aria-label="Lọc tài khoản theo vai trò" className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
        {roleOptions.map((option) => (
          <Button
            key={option.key}
            type="button"
            variant={roleFilter === option.key ? "default" : "outline"}
            size="sm"
            aria-pressed={roleFilter === option.key}
            onClick={() => onRoleFilterChange(option.key)}
            className={`h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${
              roleFilter === option.key
                ? "bg-admin-primary text-white hover:bg-admin-primary-hover"
                : "border-border-subtle bg-surface text-slate-600 hover:bg-slate-100"
            }`}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
