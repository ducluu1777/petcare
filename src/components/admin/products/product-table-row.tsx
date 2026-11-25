import { Archive, Edit, History, RotateCcw, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Product } from "@/hooks/use-products";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { getProductCategoryLabel } from "@/lib/product-category";

interface ProductTableRowProps {
  product: Product;
  formatVND: (amount: number) => string;
  canManageCatalog: boolean;
  onToggleActive: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onViewStockHistory: (product: Product) => void;
}

export function ProductTableRow({
  product,
  formatVND,
  canManageCatalog,
  onToggleActive,
  onEdit,
  onDelete,
  onAdjustStock,
  onViewStockHistory,
}: ProductTableRowProps) {
  const availableStock = Math.max(0, product.stock - (product.reservedStock ?? 0));
  const isLow = availableStock <= LOW_STOCK_THRESHOLD && availableStock > 0;
  const isOut = availableStock === 0;
  const openingStock = product.stockMovements?.[0];
  const openingStockCreatedAt = openingStock
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(openingStock.createdAt))
    : null;

  return (
    <TableRow className="hover:bg-admin-muted-surface/60 transition-colors">
      <TableCell className="py-3.5 px-4">
        <div className="font-bold text-ink">{product.name}</div>
        {product.description && (
          <div className="max-w-sm truncate text-xs text-admin-muted">{product.description}</div>
        )}
      </TableCell>
      <TableCell className="py-3.5 px-4 font-medium text-muted-text">
        {getProductCategoryLabel(product.category)}
      </TableCell>
      <TableCell className="py-3.5 px-4">
        <span className="rounded-md border border-admin-primary/20 bg-admin-primary-light px-2 py-0.5 text-xs font-bold text-admin-primary">
          {product.suitableSpecies === "DOG" ? "Chó" : product.suitableSpecies === "CAT" ? "Mèo" : "Chó & Mèo"}
        </span>
      </TableCell>
      <TableCell className="py-3.5 px-4">
        <div className="font-bold text-ink">{formatVND(product.price)}</div>
        {product.originalPrice && product.originalPrice > product.price && (
          <div className="text-xs text-admin-muted line-through">{formatVND(product.originalPrice)}</div>
        )}
      </TableCell>
      <TableCell className="py-3.5 px-4">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
          isOut
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : isLow
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}>
          {isOut ? (product.stock === 0 ? "Hết hàng" : "Hết khả dụng") : isLow ? `Chỉ còn ${availableStock} sản phẩm khả dụng` : `Còn ${availableStock} sản phẩm khả dụng`}
        </span>
        {(product.reservedStock ?? 0) > 0 && (
          <p className="mt-1 text-xs text-admin-muted">Đang giữ {product.reservedStock} cho QR</p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <Button
            type="button"
            variant="link"
            onClick={() => onAdjustStock(product)}
            className="h-10 justify-start gap-1.5 p-0 text-sm font-semibold text-admin-primary"
          >
            <SlidersHorizontal aria-hidden="true" className="size-3.5" />
            Điều chỉnh tồn
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={() => onViewStockHistory(product)}
            aria-label={`Xem lịch sử tồn kho của ${product.name}`}
            className="h-10 justify-start gap-1.5 p-0 text-sm font-semibold text-muted-text"
          >
            <History aria-hidden="true" className="size-3.5" />
            Lịch sử
          </Button>
        </div>
      </TableCell>
      <TableCell className="py-3.5 px-4">
        <div className="space-y-1">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${product.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
            {product.isActive ? "Đang bán" : "Ngừng bán"}
          </span>
          <p className="text-xs text-admin-muted">
            {(product._count?.orderItems ?? 0) > 0 ? `Đã có ${product._count?.orderItems} dòng đơn hàng` : "Chưa có đơn hàng"}
          </p>
          {(product._count?.stockMovements ?? 0) > 0 && (
            <div className="text-xs text-admin-muted">
              <p>Tồn đầu kỳ: {openingStock?.quantity ?? "—"}</p>
              {openingStock && (
                <p>
                  {openingStock.performedBy.name} · {openingStockCreatedAt}
                </p>
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {canManageCatalog && (
            <>
              <Button
                type="button"
                onClick={() => onToggleActive(product)}
                variant="ghost"
                size="icon"
                aria-label={product.isActive ? `Ngừng bán ${product.name}` : `Mở bán lại ${product.name}`}
                className={`size-10 rounded-lg ${product.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                title={product.isActive ? "Ngừng bán" : "Mở bán lại"}
              >
                {product.isActive ? <Archive aria-hidden="true" className="size-4" /> : <RotateCcw aria-hidden="true" className="size-4" />}
              </Button>
              <Button
                type="button"
                onClick={() => onEdit(product)}
                variant="ghost"
                size="icon"
                aria-label={`Sửa ${product.name}`}
                className="size-10 rounded-lg bg-admin-muted-surface text-ink hover:bg-border-subtle"
                title="Chỉnh sửa"
              >
                <Edit aria-hidden="true" className="size-4" />
              </Button>
            </>
          )}
          {canManageCatalog && (product._count?.orderItems ?? 0) === 0 && (product._count?.stockMovements ?? 0) === 0 && (
            <Button
              type="button"
              onClick={() => onDelete(product)}
              variant="ghost"
              size="icon"
              aria-label={`Xóa sản phẩm ${product.name} chưa có lịch sử`}
              className="size-10 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
              title="Xóa sản phẩm chưa phát sinh lịch sử"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
