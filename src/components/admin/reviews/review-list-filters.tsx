"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ReviewTargetFilter = "ALL" | "SERVICE" | "PRODUCT";
export type ReviewRatingFilter = number | "ALL";
export type ReviewVisibilityFilter = "ALL" | "VISIBLE" | "HIDDEN";

interface ReviewListFiltersProps {
  searchQuery: string;
  targetFilter: ReviewTargetFilter;
  ratingFilter: ReviewRatingFilter;
  visibilityFilter: ReviewVisibilityFilter;
  onSearchChange: (query: string) => void;
  onTargetChange: (target: ReviewTargetFilter) => void;
  onRatingChange: (rating: ReviewRatingFilter) => void;
  onVisibilityChange: (visibility: ReviewVisibilityFilter) => void;
}

const targetTabs: { id: ReviewTargetFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "SERVICE", label: "Dịch vụ" },
  { id: "PRODUCT", label: "Sản phẩm" },
];

const ratingTabs: { id: ReviewRatingFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả sao" },
  { id: 5, label: "5 sao" },
  { id: 4, label: "4 sao" },
  { id: 3, label: "3 sao" },
  { id: 2, label: "2 sao" },
  { id: 1, label: "1 sao" },
];

const visibilityTabs: { id: ReviewVisibilityFilter; label: string }[] = [
  { id: "ALL", label: "Mọi trạng thái" },
  { id: "VISIBLE", label: "Đang hiển thị" },
  { id: "HIDDEN", label: "Đang ẩn" },
];

export function ReviewListFilters({
  searchQuery,
  targetFilter,
  ratingFilter,
  visibilityFilter,
  onSearchChange,
  onTargetChange,
  onRatingChange,
  onVisibilityChange,
}: ReviewListFiltersProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-2xs">
      <div className="relative w-full">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-admin-muted" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm nội dung, tên khách, dịch vụ hoặc sản phẩm..."
          aria-label="Tìm đánh giá theo nội dung, khách hàng, dịch vụ hoặc sản phẩm"
          className="h-10 rounded-lg border-border-subtle bg-admin-muted-surface pl-9 text-sm focus:bg-surface"
        />
      </div>

      <div className="flex w-full flex-wrap items-center gap-2">
        <div role="group" aria-label="Lọc đánh giá theo loại nội dung" className="flex w-full max-w-full flex-wrap items-center gap-1 rounded-xl border border-border-subtle bg-admin-muted-surface p-1 sm:w-auto">
          {targetTabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={targetFilter === tab.id ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={targetFilter === tab.id}
              onClick={() => onTargetChange(tab.id)}
              className={`h-10 rounded-lg px-3 text-sm font-semibold transition-all ${
                targetFilter === tab.id
                  ? "bg-surface text-admin-primary shadow-xs hover:bg-surface"
                  : "text-muted-text hover:text-ink"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div role="group" aria-label="Lọc đánh giá theo số sao" className="flex w-full max-w-full flex-wrap items-center gap-1 rounded-xl border border-border-subtle bg-admin-muted-surface p-1 sm:w-auto">
          {ratingTabs.map((tab) => (
            <Button
              key={String(tab.id)}
              type="button"
              variant={ratingFilter === tab.id ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={ratingFilter === tab.id}
              onClick={() => onRatingChange(tab.id)}
              className={`h-10 rounded-lg px-2.5 text-sm font-semibold transition-all ${
                ratingFilter === tab.id
                  ? "bg-surface text-admin-primary shadow-xs hover:bg-surface"
                  : "text-muted-text hover:text-ink"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div role="group" aria-label="Lọc đánh giá theo trạng thái hiển thị" className="flex w-full max-w-full flex-wrap items-center gap-1 rounded-xl border border-border-subtle bg-admin-muted-surface p-1 sm:w-auto">
          {visibilityTabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={visibilityFilter === tab.id ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={visibilityFilter === tab.id}
              onClick={() => onVisibilityChange(tab.id)}
              className={`h-10 rounded-lg px-2.5 text-sm font-semibold transition-all ${
                visibilityFilter === tab.id
                  ? "bg-surface text-admin-primary shadow-xs hover:bg-surface"
                  : "text-muted-text hover:text-ink"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
