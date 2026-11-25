"use client";

import * as React from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminProductStockMovements,
  type Product,
} from "@/hooks/use-products";

interface StockMovementHistoryDialogProps {
  open: boolean;
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));

export function StockMovementHistoryDialog({
  open,
  product,
  onOpenChange,
}: StockMovementHistoryDialogProps) {
  const [pagination, setPagination] = React.useState({
    productId: "",
    page: 1,
  });
  const page = product?.id === pagination.productId ? pagination.page : 1;
  const query = useAdminProductStockMovements(product?.id, page, open);
  const movements = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] space-y-4 border-border-subtle bg-surface p-6 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Lịch sử tồn kho</DialogTitle>
          <DialogDescription>
            Các lần ghi nhận tồn đầu kỳ và điều chỉnh thủ công của sản phẩm.
          </DialogDescription>
        </DialogHeader>

        {product && (
          <div className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-admin-muted-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-ink">{product.name}</p>
            <p className="text-xs text-muted-text">
              Tồn thực tế {product.stock} · Đang giữ QR{" "}
              {product.reservedStock ?? 0} · Khả dụng{" "}
              {Math.max(0, product.stock - (product.reservedStock ?? 0))}
            </p>
          </div>
        )}

        {query.isLoading ? (
          <AdminDataState variant="loading" title="Đang tải lịch sử tồn kho…" />
        ) : query.isError ? (
          <AdminDataState
            variant="error"
            title="Không tải được lịch sử tồn kho."
            description="Thử tải lại để xem các lần điều chỉnh đã ghi nhận."
            onRetry={() => query.refetch()}
          />
        ) : movements.length === 0 ? (
          <AdminDataState
            variant="empty"
            title="Chưa có biến động tồn kho được ghi nhận."
            description="Các lần điều chỉnh mới sẽ xuất hiện tại đây."
          />
        ) : (
          <>
            <div className="max-h-[50dvh] overflow-auto rounded-xl border border-border-subtle">
              <Table className="min-w-[760px] text-left text-sm">
                <TableHeader className="sticky top-0 z-10 bg-admin-muted-surface text-muted-text">
                  <TableRow>
                    <TableHead>Thời điểm</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Thay đổi</TableHead>
                    <TableHead>Tồn trước → sau</TableHead>
                    <TableHead>Lý do</TableHead>
                    <TableHead>Người thực hiện</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(movement.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {movement.type === "OPENING_BALANCE"
                          ? "Tồn đầu kỳ"
                          : "Điều chỉnh"}
                      </TableCell>
                      <TableCell
                        className={`whitespace-nowrap font-semibold tabular-nums ${movement.quantity < 0 ? "text-rose-700" : "text-emerald-700"}`}
                      >
                        {movement.quantity > 0
                          ? `+${movement.quantity}`
                          : movement.quantity}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {movement.stockBefore} → {movement.stockAfter}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-normal">
                        {movement.reason}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {movement.performedBy.name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {meta && (
              <AdminPagination
                from={(meta.page - 1) * meta.limit + 1}
                to={Math.min(meta.page * meta.limit, meta.total)}
                total={meta.total}
                itemLabel="biến động tồn kho"
                page={meta.page}
                totalPages={meta.totalPages}
                onPageChange={(nextPage) => {
                  if (product) {
                    setPagination({ productId: product.id, page: nextPage });
                  }
                }}
              />
            )}
          </>
        )}

        <div className="flex justify-end border-t border-border-subtle pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
