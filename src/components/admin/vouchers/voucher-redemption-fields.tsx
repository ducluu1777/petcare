import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VoucherRedemptionType } from "@/lib/admin-voucher-types";

interface VoucherRedemptionFieldsProps {
  redemptionType: VoucherRedemptionType | null;
  onRedemptionTypeChange: (value: VoucherRedemptionType) => void;
}

export function VoucherRedemptionFields({
  redemptionType,
  onRedemptionTypeChange,
}: VoucherRedemptionFieldsProps) {
  return (
    <div>
      <label htmlFor="voucher-redemption-type" className="mb-1 block font-bold text-ink">
        Cách nhận voucher <span aria-hidden="true">*</span>
      </label>
      <Select
        items={{ POINTS: "Đổi bằng điểm tích lũy", CODE: "Dùng mã voucher" }}
        value={redemptionType}
        onValueChange={(value) => {
          if (value === "POINTS" || value === "CODE") onRedemptionTypeChange(value);
        }}
      >
        <SelectTrigger
          id="voucher-redemption-type"
          aria-required="true"
          aria-describedby="voucher-redemption-type-help"
          className="w-full h-10 rounded-xl border-border-subtle bg-admin-muted-surface text-sm"
        >
          <SelectValue placeholder="Chọn cách nhận voucher" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="POINTS">Đổi bằng điểm tích lũy</SelectItem>
          <SelectItem value="CODE">Dùng mã voucher</SelectItem>
        </SelectContent>
      </Select>
      <p id="voucher-redemption-type-help" className="mt-1 text-xs text-muted-text">
        Khách dùng mã trực tiếp hoặc tự đổi voucher bằng điểm trong tài khoản.
      </p>
    </div>
  );
}

interface VoucherRedemptionFollowUpProps {
  redemptionType: VoucherRedemptionType | null;
  pointCost: string;
  onPointCostChange: (value: string) => void;
}

export function VoucherRedemptionFollowUp({
  redemptionType,
  pointCost,
  onPointCostChange,
}: VoucherRedemptionFollowUpProps) {
  if (redemptionType === "POINTS") {
    return (
      <div>
        <label htmlFor="voucher-point-cost" className="mb-1 block font-bold text-ink">
          Số điểm cần đổi <span aria-hidden="true">*</span>
        </label>
        <Input
          id="voucher-point-cost"
          type="number"
          required
          min={1}
          value={pointCost}
          onChange={(event) => onPointCostChange(event.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-admin-muted-surface text-sm focus-visible:bg-surface focus-visible:outline-none focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary"
        />
      </div>
    );
  }
  if (redemptionType === "CODE") {
    return (
      <p className="rounded-lg border border-border-subtle bg-admin-muted-surface px-3 py-2 text-xs text-muted-text">
        Voucher này dùng theo mã và điều kiện áp dụng; khách không đổi bằng điểm.
      </p>
    );
  }
  if (redemptionType === null) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Chọn cách nhận voucher để tiếp tục. Khách tự đổi điểm; nhân viên không đổi thay khách.
      </p>
    );
  }
  return null;
}
