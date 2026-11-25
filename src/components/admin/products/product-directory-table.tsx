import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminTableSkeleton } from "@/components/admin/admin-table-skeleton";
import { AdminTableViewport } from "@/components/admin/admin-table-viewport";
import { ProductTableRow } from "@/components/admin/products/product-table-row";
import type { Product } from "@/hooks/use-products";

interface ProductDirectoryTableProps {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  onRetry: () => unknown;
  onClearFilters: () => void;
  formatVND: (amount: number) => string;
  canManageCatalog: boolean;
  onToggleActive: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onViewStockHistory: (product: Product) => void;
}

export function ProductDirectoryTable({
  products,
  isLoading,
  isError,
  hasFilters,
  onRetry,
  onClearFilters,
  formatVND,
  canManageCatalog,
  onToggleActive,
  onEdit,
  onDelete,
  onAdjustStock,
  onViewStockHistory,
}: ProductDirectoryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xs">
      {isError ? (
        <AdminDataState variant="error" title="Không tải được danh sách sản phẩm." onRetry={onRetry} />
      ) : !isLoading && products.length === 0 ? (
        <AdminDataState
          variant="empty"
          title={hasFilters ? "Không tìm thấy sản phẩm phù hợp." : "Chưa có sản phẩm nào."}
          description={hasFilters
            ? "Thử đổi từ khóa hoặc xóa bộ lọc để xem sản phẩm đang ngừng bán."
            : "Thêm sản phẩm để bắt đầu quản lý danh mục và tồn kho."}
          action={hasFilters ? (
            <Button type="button" variant="link" onClick={onClearFilters} className="h-auto p-0 text-sm font-semibold text-admin-primary">
              Xóa bộ lọc
            </Button>
          ) : undefined}
        />
      ) : (
      <AdminTableViewport label="Danh sách sản phẩm">
        <Table className="w-full min-w-[1000px] text-left text-sm">
          <TableHeader className="border-b border-border-subtle bg-admin-muted-surface font-bold text-muted-text">
            <TableRow>
              <TableHead className="px-4 py-3">Tên sản phẩm</TableHead>
              <TableHead className="px-4 py-3">Danh mục</TableHead>
              <TableHead className="px-4 py-3">Dành cho</TableHead>
              <TableHead className="px-4 py-3">Giá bán</TableHead>
              <TableHead className="px-4 py-3">Tồn kho</TableHead>
              <TableHead className="px-4 py-3">Trạng thái</TableHead>
              <TableHead className="px-4 py-3 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border-subtle" aria-busy={isLoading}>
            {isLoading ? (
              <AdminTableSkeleton columns={7} label="sản phẩm trong kho" />
            ) : (
              products.map((product) => (
                <ProductTableRow
                  key={product.id}
                  product={product}
                  formatVND={formatVND}
                  canManageCatalog={canManageCatalog}
                  onToggleActive={onToggleActive}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAdjustStock={onAdjustStock}
                  onViewStockHistory={onViewStockHistory}
                />
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableViewport>
      )}
    </div>
  );
}
