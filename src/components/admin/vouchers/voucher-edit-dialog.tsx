"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UpdateVoucherPayload, VoucherItem } from "@/hooks/use-vouchers";
import { formatLoyaltyCopy } from "@/lib/loyalty-copy";

interface VoucherEditDialogProps {
  open: boolean;
  voucher: VoucherItem | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateVoucherPayload) => void | Promise<void>;
}

function getVietnamDateInput(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function VoucherEditDialog({
  open,
  voucher,
  isSaving,
  onOpenChange,
  onSubmit,
}: VoucherEditDialogProps) {
  const [expiryDate, setExpiryDate] = React.useState(() => voucher ? getVietnamDateInput(voucher.expiryDate) : "");
  const initialLimit = voucher?.usageLimit ?? -1;
  const [isUnlimited, setIsUnlimited] = React.useState(initialLimit === -1);
  const [usageLimit, setUsageLimit] = React.useState(initialLimit === -1 ? "" : String(initialLimit));
  const [usageLimitPerUser, setUsageLimitPerUser] = React.useState(String(voucher?.usageLimitPerUser ?? 1));

  const minimumLimit = Math.max(1, voucher?.usageCount ?? 0);
  const parsedLimit = Number(usageLimit);
  const canSave = !!voucher && !!expiryDate && (isUnlimited ||
    (Number.isInteger(parsedLimit) && parsedLimit >= minimumLimit)) &&
    (usageLimitPerUser === "1" || usageLimitPerUser === "-1");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    await onSubmit({
      expiryDate,
      usageLimit: isUnlimited ? -1 : parsedLimit,
      ...(voucher?.pointCost == null ? { usageLimitPerUser: Number(usageLimitPerUser) as 1 | -1 } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border-subtle bg-surface">
        <DialogHeader>
          <span className="mb-1 grid size-10 place-items-center rounded-xl bg-admin-primary-light text-admin-primary">
            <CalendarClock aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle className="text-ink">Cập nhật thời hạn và lượt dùng</DialogTitle>
          <DialogDescription className="text-muted-text">
            {voucher ? <><span className="font-semibold text-ink">{voucher.code}</span> · {formatLoyaltyCopy(voucher.title)}</> : ""}
            <br />Mã và điều kiện ưu đãi không thay đổi; lựa chọn lượt dùng áp dụng cho các giao dịch tiếp theo.
          </DialogDescription>
        </DialogHeader>

        {voucher && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="voucher-edit-expiry" className="text-sm font-semibold text-ink">Hạn sử dụng <span aria-hidden="true">*</span></label>
              <Input
                id="voucher-edit-expiry"
                type="date"
                required
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                className="h-11 rounded-lg border-admin-border-field bg-surface"
              />
              <p className="text-xs text-muted-text">Voucher dùng được hết ngày đã chọn theo giờ Việt Nam.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="voucher-edit-unlimited"
                  checked={isUnlimited}
                  onCheckedChange={(checked) => setIsUnlimited(checked === true)}
                />
                <label htmlFor="voucher-edit-unlimited" className="text-sm font-medium text-ink">Không giới hạn tổng lượt chương trình</label>
              </div>
              {!isUnlimited && (
                <div className="space-y-2">
                  <label htmlFor="voucher-edit-limit" className="text-sm font-semibold text-ink">Tổng lượt tối đa của chương trình <span aria-hidden="true">*</span></label>
                  <Input
                    id="voucher-edit-limit"
                    type="number"
                    min={minimumLimit}
                    step={1}
                    required
                    value={usageLimit}
                    onChange={(event) => setUsageLimit(event.target.value)}
                    className="h-11 rounded-lg border-admin-border-field bg-surface"
                    aria-describedby="voucher-edit-limit-help"
                  />
                  <p id="voucher-edit-limit-help" className="text-xs text-muted-text">
                    Đã dùng {voucher.usageCount ?? 0} lượt trên toàn chương trình. Giới hạn không thể thấp hơn số này.
                  </p>
                </div>
              )}
            </div>

            {voucher.pointCost == null && (
              <div className="space-y-2">
                <label htmlFor="voucher-edit-account-limit" className="text-sm font-semibold text-ink">
                  Lượt dùng trên mỗi tài khoản <span aria-hidden="true">*</span>
                </label>
                <Select items={{ "1": "Một lần mỗi tài khoản", "-1": "Nhiều lần mỗi tài khoản" }} value={usageLimitPerUser} onValueChange={(value) => value && setUsageLimitPerUser(value)}>
                  <SelectTrigger id="voucher-edit-account-limit" className="h-11 rounded-lg border-admin-border-field bg-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Một lần mỗi tài khoản</SelectItem>
                    <SelectItem value="-1">Nhiều lần mỗi tài khoản</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-text">
                  {usageLimitPerUser === "1"
                    ? "Mỗi tài khoản dùng mã một lần trên cả ba kênh. Ví dụ: Lan đã dùng ở Spa thì không thể dùng lại cho đơn online hoặc bán tại quầy."
                    : "Một tài khoản có thể dùng mã nhiều lần trên cả ba kênh khi từng giao dịch đủ điều kiện."} Giới hạn tổng lượt chương trình (nếu có) áp dụng riêng; lượt đã ghi nhận vẫn được giữ trong lịch sử.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 border-t border-border-subtle pt-4 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving} className="h-10 rounded-lg">
                Đóng
              </Button>
              <Button type="submit" disabled={!canSave || isSaving} className="h-10 rounded-lg bg-admin-primary text-white hover:bg-admin-primary-hover">
                {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
