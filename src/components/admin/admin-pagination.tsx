import { Button } from "@/components/ui/button";

interface AdminPaginationProps {
  from: number;
  to: number;
  total: number;
  itemLabel: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function AdminPagination({
  from,
  to,
  total,
  itemLabel,
  page,
  totalPages,
  onPageChange,
}: AdminPaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-text" aria-live="polite">
        Hiển thị {from}–{to} trong {total} {itemLabel}
      </p>
      <nav aria-label="Phân trang danh sách" className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Trước
        </Button>
        <span className="min-w-20 text-center text-xs tabular-nums text-ink">
          Trang {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Sau
        </Button>
      </nav>
    </div>
  );
}
