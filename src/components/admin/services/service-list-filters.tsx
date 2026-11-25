"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Scissors, Tag } from "lucide-react";

export type ServiceCategoryFilter = "ALL" | "SPA" | "ADDON";
export type ServiceActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

interface ServiceListFiltersProps {
  categoryFilter: ServiceCategoryFilter;
  activeFilter: ServiceActiveFilter;
  searchQuery: string;
  totalCount: number | null;
  spaCount: number | null;
  addonCount: number | null;
  onCategoryFilterChange: (filter: ServiceCategoryFilter) => void;
  onActiveFilterChange: (filter: ServiceActiveFilter) => void;
  onSearchQueryChange: (query: string) => void;
}

export function ServiceListFilters({
  categoryFilter,
  activeFilter,
  searchQuery,
  totalCount,
  spaCount,
  addonCount,
  onCategoryFilterChange,
  onActiveFilterChange,
  onSearchQueryChange,
}: ServiceListFiltersProps) {
  const countLabel = (count: number | null) => count === null ? "—" : count;

  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs md:flex-row md:items-center">
      <div role="group" aria-label="Lọc theo nhóm dịch vụ" className="flex w-full items-center gap-1.5 overflow-x-auto rounded-lg border border-border-subtle bg-slate-100 p-1 sm:w-auto">
        <Button
          type="button"
          size="sm"
          variant={categoryFilter === "ALL" ? "secondary" : "ghost"}
          aria-pressed={categoryFilter === "ALL"}
          onClick={() => onCategoryFilterChange("ALL")}
          className={`h-10 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-all ${
            categoryFilter === "ALL" ? "bg-surface font-bold text-primary shadow-xs" : "text-muted-text hover:text-ink"
          }`}
        >
          Tất cả gói ({countLabel(totalCount)})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={categoryFilter === "SPA" ? "secondary" : "ghost"}
          aria-pressed={categoryFilter === "SPA"}
          onClick={() => onCategoryFilterChange("SPA")}
          className={`h-10 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-all ${
            categoryFilter === "SPA" ? "bg-surface font-bold text-primary shadow-xs" : "text-muted-text hover:text-ink"
          }`}
        >
          <Scissors aria-hidden="true" className="size-3.5" />
          <span>Spa &amp; chăm sóc ({countLabel(spaCount)})</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={categoryFilter === "ADDON" ? "secondary" : "ghost"}
          aria-pressed={categoryFilter === "ADDON"}
          onClick={() => onCategoryFilterChange("ADDON")}
          className={`h-10 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-all ${
            categoryFilter === "ADDON" ? "bg-surface font-bold text-primary shadow-xs" : "text-muted-text hover:text-ink"
          }`}
        >
          <Tag aria-hidden="true" className="size-3.5" />
          <span>Dịch vụ bổ sung ({countLabel(addonCount)})</span>
        </Button>
      </div>

      <div className="relative flex-1 md:max-w-xs">
        <Select items={{ ACTIVE: "Đang cung cấp", INACTIVE: "Tạm ngừng", ALL: "Tất cả trạng thái" }} value={activeFilter} onValueChange={(value) => value && onActiveFilterChange(value as ServiceActiveFilter)}>
          <SelectTrigger className="h-10 w-full rounded-lg border-border-subtle bg-slate-50 text-sm md:w-44" aria-label="Lọc trạng thái cung cấp dịch vụ">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Đang cung cấp</SelectItem>
            <SelectItem value="INACTIVE">Tạm ngừng</SelectItem>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex-1 md:max-w-xs">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Tìm theo tên hoặc mã dịch vụ..."
          aria-label="Tìm dịch vụ theo tên hoặc mã"
          className="h-10 rounded-lg border-border-subtle bg-slate-50 pl-9 text-sm text-ink hover:bg-slate-100/80 focus:bg-surface"
        />
      </div>
    </div>
  );
}
