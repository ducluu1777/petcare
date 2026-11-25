import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/hooks/use-products";

interface CounterSaleSelectedItemProps {
  product: Product;
  quantity: number;
  available: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function CounterSaleSelectedItem({
  product,
  quantity,
  available,
  onDecrease,
  onIncrease,
}: CounterSaleSelectedItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{product.name}</p>
        <p className="text-xs text-muted-text">{formatVND(product.price)} / sản phẩm</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="size-10" aria-label={`Giảm số lượng ${product.name}`} onClick={onDecrease}>
          <Minus aria-hidden="true" className="size-3.5" />
        </Button>
        <span className="w-6 text-center font-semibold tabular-nums">{quantity}</span>
        <Button type="button" variant="outline" size="icon" className="size-10" aria-label={`Tăng số lượng ${product.name}`} disabled={quantity >= available} onClick={onIncrease}>
          <Plus aria-hidden="true" className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface CounterSaleProductOptionProps {
  product: Product;
  quantity: number;
  available: number;
  onAdd: () => void;
}

export function CounterSaleProductOption({ product, quantity, available, onAdd }: CounterSaleProductOptionProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-admin-muted-surface">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
        <p className="mt-0.5 text-xs text-muted-text">{formatVND(product.price)} · Còn khả dụng {available}</p>
      </div>
      <Button type="button" size="sm" variant={quantity ? "secondary" : "outline"} className="min-h-10" disabled={available === 0 || quantity >= available} onClick={onAdd}>
        <Plus aria-hidden="true" className="size-3.5" />
        {quantity ? "Thêm nữa" : "Thêm"}
      </Button>
    </div>
  );
}
