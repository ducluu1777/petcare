import { Input } from "@/components/ui/input";
import type { VoucherDiscountType } from "@/lib/admin-voucher-types";

interface VoucherDiscountAmountFieldsProps {
  discountType: VoucherDiscountType;
  discountValue: string;
  maxDiscount: string;
  onDiscountValueChange: (value: string) => void;
  onMaxDiscountChange: (value: string) => void;
}

export function VoucherDiscountAmountFields({
  discountType,
  discountValue,
  maxDiscount,
  onDiscountValueChange,
  onMaxDiscountChange,
}: VoucherDiscountAmountFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="voucher-discount-value" className="mb-1 block font-bold text-ink">
          {discountType === "PERCENTAGE" ? "Mức giảm (%)" : "Mức giảm (VNĐ)"} <span aria-hidden="true">*</span>
        </label>
        <Input
          id="voucher-discount-value"
          type="number"
          required
          min={1}
          value={discountValue}
          onChange={(event) => onDiscountValueChange(event.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-admin-muted-surface text-sm focus-visible:bg-surface focus-visible:outline-none focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary"
        />
      </div>
      {discountType === "PERCENTAGE" && (
        <div>
          <label htmlFor="voucher-max-discount" className="mb-1 block font-bold text-ink">
            Mức giảm tối đa (VNĐ) <span aria-hidden="true">*</span>
          </label>
          <Input
            id="voucher-max-discount"
            type="number"
            required
            min={0}
            step={1}
            value={maxDiscount}
            onChange={(event) => onMaxDiscountChange(event.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-admin-muted-surface text-sm focus-visible:bg-surface focus-visible:outline-none focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary"
          />
        </div>
      )}
    </div>
  );
}
