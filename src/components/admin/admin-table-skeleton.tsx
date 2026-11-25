import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

const COLUMN_WIDTHS = [
  "w-20",
  "w-28",
  "w-24",
  "w-16",
  "w-32",
  "w-24",
  "w-20",
  "w-16",
]

type AdminTableSkeletonProps = {
  columns: number
  label: string
  rows?: number
}

export function AdminTableSkeleton({ columns, label, rows = 5 }: AdminTableSkeletonProps) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <TableRow key={`loading-row-${rowIndex}`} className="border-border-subtle">
      {Array.from({ length: columns }, (_, columnIndex) => (
        <TableCell key={`loading-cell-${columnIndex}`} className="px-4 py-4">
          {rowIndex === 0 && columnIndex === 0 && (
            <span className="sr-only" role="status" aria-live="polite">
              Đang tải {label}.
            </span>
          )}
          <Skeleton
            aria-hidden="true"
            className={`h-4 ${COLUMN_WIDTHS[(columnIndex + rowIndex) % COLUMN_WIDTHS.length]}`}
          />
        </TableCell>
      ))}
    </TableRow>
  ))
}
