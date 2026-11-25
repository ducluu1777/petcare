"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  Product,
  ProductStockAdjustmentPayload,
} from "@/hooks/use-products";

interface StockAdjustmentDialogProps {
  open: boolean;
  product: Product | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductStockAdjustmentPayload) => void | Promise<void>;
}

export function StockAdjustmentDialog({
  open,
  product,
  isSaving,
  onOpenChange,
  onSubmit,
}: StockAdjustmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] space-y-4 border-border-subtle bg-surface p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
          <DialogDescription>
            Nhập số lượng chênh lệch và lý do. Hệ thống lưu số tồn trước/sau,
            người thực hiện và thời điểm.
          </DialogDescription>
        </DialogHeader>
        {open && product && (
          <StockAdjustmentForm
            key={product.id}
            product={product}
            isSaving={isSaving}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface StockAdjustmentFormProps {
  product: Product;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductStockAdjustmentPayload) => void | Promise<void>;
}

function StockAdjustmentForm({
  product,
  isSaving,
  onOpenChange,
  onSubmit,
}: StockAdjustmentFormProps) {
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState("");
  const quantityDelta = quantity.trim() === "" ? null : Number(quantity);
  const stockAfter =
    quantityDelta !== null && Number.isInteger(quantityDelta)
      ? product.stock + quantityDelta
      : null;
  const reservedStock = product.reservedStock ?? 0;
  const isNegative = stockAfter !== null && stockAfter < 0;
  const violatesReservation = stockAfter !== null && stockAfter < reservedStock;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      quantityDelta === null ||
      !Number.isInteger(quantityDelta) ||
      quantityDelta === 0
    ) {
      return;
    }
    if (stockAfter === null || isNegative || violatesReservation) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;
    void onSubmit({ quantity: quantityDelta, reason: trimmedReason });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-border-subtle bg-admin-muted-surface p-3">
        <p className="font-semibold text-ink">{product.name}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-text">Tồn thực tế</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
              {product.stock}
            </p>
          </div>
          <div>
            <p className="text-muted-text">Đang giữ QR</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
              {reservedStock}
            </p>
          </div>
          <div>
            <p className="text-muted-text">Khả dụng</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
              {Math.max(0, product.stock - reservedStock)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="stock-adjustment-quantity"
          className="mb-1 block text-sm font-semibold text-ink"
        >
          Chênh lệch số lượng <span aria-hidden="true">*</span>
        </label>
        <Input
          id="stock-adjustment-quantity"
          type="number"
          required
          step={1}
          min={reservedStock - product.stock}
          max={2_147_483_647 - product.stock}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="Ví dụ: 5 hoặc -3"
          aria-describedby="stock-adjustment-quantity-help"
          aria-invalid={
            isNegative || violatesReservation || quantity === "0" || undefined
          }
        />
        <p
          id="stock-adjustment-quantity-help"
          className="mt-1 text-xs text-muted-text"
        >
          Số dương để tăng, số âm để giảm. Ví dụ kiểm kê thiếu 3 chai thì nhập
          -3.
        </p>
      </div>

      {stockAfter !== null &&
        Number.isInteger(quantityDelta) &&
        quantityDelta !== 0 && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              isNegative || violatesReservation
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {isNegative
              ? "Tồn sau điều chỉnh không thể thấp hơn 0."
              : violatesReservation
                ? `Tồn sau điều chỉnh (${stockAfter}) thấp hơn ${reservedStock} sản phẩm đang giữ cho QR.`
                : `Tồn sau điều chỉnh: ${stockAfter} · Khả dụng: ${Math.max(0, stockAfter - reservedStock)}`}
          </div>
        )}

      <div>
        <label
          htmlFor="stock-adjustment-reason"
          className="mb-1 block text-sm font-semibold text-ink"
        >
          Lý do điều chỉnh <span aria-hidden="true">*</span>
        </label>
        <Textarea
          id="stock-adjustment-reason"
          required
          maxLength={300}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ví dụ: Kiểm kê thực tế thiếu 3 chai."
          aria-describedby="stock-adjustment-reason-help"
        />
        <p
          id="stock-adjustment-reason-help"
          className="mt-1 text-xs text-muted-text"
        >
          Tối đa 300 ký tự. Lý do sẽ được lưu trong lịch sử tồn kho.
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-border-subtle pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={
            isSaving ||
            quantityDelta === null ||
            !Number.isInteger(quantityDelta) ||
            quantityDelta === 0 ||
            isNegative ||
            violatesReservation ||
            !reason.trim()
          }
        >
          {isSaving ? "Đang lưu…" : "Lưu điều chỉnh"}
        </Button>
      </div>
    </form>
  );
}
