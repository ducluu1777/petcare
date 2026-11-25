"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export type ProductCategoryFilter = "ALL" | "FOOD" | "SNACK" | "CARE" | "ACCESSORY";
export type ProductActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

interface ProductListFiltersProps {
  searchQuery: string;
  selectedCategory: ProductCategoryFilter;
  activeFilter: ProductActiveFilter;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: ProductCategoryFilter) => void;
  onActiveFilterChange: (filter: ProductActiveFilter) => void;
}

const categories: { id: ProductCategoryFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "FOOD", label: "Thức ăn" },
  { id: "SNACK", label: "Đồ ăn vặt" },
  { id: "CARE", label: "Chăm sóc" },
  { id: "ACCESSORY", label: "Phụ kiện" },
];

export function ProductListFilters({
  searchQuery,
  selectedCategory,
  activeFilter,
  onSearchChange,
  onCategoryChange,
  onActiveFilterChange,
}: ProductListFiltersProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-2xs sm:flex-row">
      <div className="relative w-full sm:w-80">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-admin-muted" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên sản phẩm..."
          aria-label="Tìm sản phẩm theo tên"
          className="h-10 rounded-lg border-border-subtle bg-admin-muted-surface pl-9 text-sm focus:bg-surface"
        />
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <Select items={{ ACTIVE: "Đang bán", INACTIVE: "Ngừng bán", ALL: "Tất cả trạng thái" }} value={activeFilter} onValueChange={(value) => value && onActiveFilterChange(value as ProductActiveFilter)}>
          <SelectTrigger className="h-10 w-full rounded-lg border-border-subtle bg-admin-muted-surface text-sm sm:w-44" aria-label="Lọc trạng thái bán">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Đang bán</SelectItem>
            <SelectItem value="INACTIVE">Ngừng bán</SelectItem>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
          </SelectContent>
        </Select>
        <div
          role="group"
          aria-label="Lọc theo danh mục sản phẩm"
          className="flex w-full items-center gap-1.5 overflow-x-auto sm:w-auto"
        >
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`h-10 shrink-0 rounded-lg px-3 text-sm font-semibold ${
                selectedCategory === category.id
                  ? "bg-admin-primary text-white hover:bg-admin-primary-hover"
                  : "border-border-subtle bg-admin-muted-surface text-muted-text hover:bg-surface hover:text-ink"
              }`}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
