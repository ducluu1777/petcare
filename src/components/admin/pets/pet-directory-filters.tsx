"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type PetSpeciesFilter = "ALL" | "DOG" | "CAT";

interface PetDirectoryFiltersProps {
  speciesFilter: PetSpeciesFilter;
  searchQuery: string;
  allCount: number | null;
  dogCount: number | null;
  catCount: number | null;
  onSpeciesChange: (species: PetSpeciesFilter) => void;
  onSearchChange: (query: string) => void;
}

export function PetDirectoryFilters({
  speciesFilter,
  searchQuery,
  allCount,
  dogCount,
  catCount,
  onSpeciesChange,
  onSearchChange,
}: PetDirectoryFiltersProps) {
  const countLabel = (count: number | null) => count === null ? "—" : count;
  const filters: { id: PetSpeciesFilter; label: string; count: number | null }[] = [
    { id: "ALL", label: "Tất cả", count: allCount },
    { id: "DOG", label: "Chó", count: dogCount },
    { id: "CAT", label: "Mèo", count: catCount },
  ];

  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs md:flex-row md:items-center">
      <div role="group" aria-label="Lọc hồ sơ theo loài thú cưng" className="flex w-full items-center gap-1.5 overflow-x-auto rounded-lg border border-border-subtle bg-slate-100 p-1 sm:w-auto">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            size="sm"
            variant={speciesFilter === filter.id ? "secondary" : "ghost"}
            aria-pressed={speciesFilter === filter.id}
            onClick={() => onSpeciesChange(filter.id)}
            className={`h-10 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-all ${
              speciesFilter === filter.id ? "bg-surface font-bold text-primary shadow-xs" : "text-muted-text hover:text-ink"
            }`}
          >
            {filter.label} ({countLabel(filter.count)})
          </Button>
        ))}
      </div>

      <div className="relative flex-1 md:max-w-md">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo mã hồ sơ, tên thú cưng, giống, chủ nuôi hoặc số điện thoại..."
          aria-label="Tìm hồ sơ thú cưng theo mã, tên, giống, chủ nuôi hoặc số điện thoại"
          className="h-10 rounded-lg border-border-subtle bg-slate-50 pl-9 text-sm text-ink hover:bg-slate-100/80 focus:bg-surface"
        />
      </div>
    </div>
  );
}
