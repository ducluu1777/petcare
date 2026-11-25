"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VoucherDiscountAmountFields } from "@/components/admin/vouchers/voucher-discount-amount-fields";
import { VoucherRedemptionFields, VoucherRedemptionFollowUp } from "@/components/admin/vouchers/voucher-redemption-fields";
import type { VoucherDiscountType, VoucherRedemptionType } from "@/lib/admin-voucher-types";

interface VoucherFormDialogState {
  open: boolean;
  code: string;
  title: string;
  description: string;
  discountType: VoucherDiscountType;
  discountValue: string;
  maxDiscount: string;
  minSpend: string;
  redemptionType: VoucherRedemptionType | null;
  usageLimitPerUser: string;
  pointCost: string;
  expiryDate: string;
  isCreating: boolean;
}

interface VoucherFormDialogActions {
  onOpenChange: (open: boolean) => void;
  setCode: (value: string) => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setDiscountType: (value: VoucherDiscountType) => void;
  setDiscountValue: (value: string) => void;
  setMaxDiscount: (value: string) => void;
  setMinSpend: (value: string) => void;
  setRedemptionType: (value: VoucherRedemptionType) => void;
  setUsageLimitPerUser: (value: string) => void;
  setPointCost: (value: string) => void;
  setExpiryDate: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void | Promise<void>;
}

interface VoucherFormDialogProps {
  state: VoucherFormDialogState;
  actions: VoucherFormDialogActions;
}

export function VoucherFormDialog({ state, actions }: VoucherFormDialogProps) {
  const {
    open: isModalOpen,
    code,
    title,
    description,
    discountType,
    discountValue,
    maxDiscount,
    minSpend,
    redemptionType,
    usageLimitPerUser,
    pointCost,
    expiryDate,
    isCreating,
  } = state;
  const {
    onOpenChange: setIsModalOpen,
    setCode,
    setTitle,
    setDescription,
    setDiscountType,
    setDiscountValue,
    setMaxDiscount,
    setMinSpend,
    setRedemptionType,
    setUsageLimitPerUser,
    setPointCost,
    setExpiryDate,
    onSubmit: handleSubmit,
  } = actions;

  return (
    <>
      {/* 5. CREATE MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent showCloseButton={false} className="w-full max-w-[calc(100%-2rem)] space-y-4 overflow-y-auto border-border-subtle bg-surface p-6 max-h-[90dvh] sm:max-w-lg">
            <DialogHeader className="flex-row items-center justify-between border-b border-border-subtle pb-3">
              <DialogTitle className="text-lg font-semibold text-ink">Tạo voucher mới</DialogTitle>
              <DialogDescription className="sr-only">
                Tạo voucher dùng mã hoặc voucher đổi bằng điểm và nhập đầy đủ điều kiện ưu đãi.
              </DialogDescription>
              <Button
                type="button"
                onClick={() => setIsModalOpen(false)}
                variant="ghost"
                size="icon"
                aria-label="Đóng biểu mẫu"
                className="size-10 rounded-lg text-muted-text"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
              <p className="text-xs text-muted-text"><span aria-hidden="true">*</span> Trường bắt buộc nhập.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="voucher-code" className="mb-1 block font-bold text-ink">Mã voucher <span aria-hidden="true">*</span></label>
                  <Input
                    id="voucher-code"
                    type="text"
                    required
                    placeholder="SPA20, PETCAREVIP"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-admin-muted-surface text-sm uppercase font-semibold focus-visible:bg-surface focus-visible:outline-none focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary"
                  />
                </div>
                <div>
                  <label htmlFor="voucher-discount-type" className="mb-1 block font-bold text-ink">Hình thức giảm</label>
                  <Select
                    items={{ PERCENTAGE: "Theo phần trăm (%)", FIXED: "Số tiền cố định (VNĐ)" }}
                    value={discountType}
                    onValueChange={(value) => {
                      if (value) setDiscountType(value as VoucherDiscountType)
                    }}
                  >
                    <SelectTrigger id="voucher-discount-type" className="w-full h-10 rounded-xl border-border-subtle bg-admin-muted-surface text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Theo phần trăm (%)</SelectItem>
                      <SelectItem value="FIXED">Số tiền cố định (VNĐ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label htmlFor="voucher-title" className="mb-1 block font-bold text-ink">Tên chương trình <span aria-hidden="true">*</span></label>
                <Input
                  id="voucher-title"
                  type="text"
                  required
                  placeholder="Ví dụ: Giảm 20% dịch vụ chăm sóc trọn gói"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-admin-muted-surface text-sm focus-visible:bg-surface focus-visible:outline-none focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary"
                />
              </div>

              <div>
                <label htmlFor="voucher-description" className="mb-1 block font-bold text-ink">Mô tả</label>
                <Textarea
                  id="voucher-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn chương trình; voucher không giới hạn loại dịch vụ hoặc sản phẩm."
                  className="border-border-subtle bg-admin-muted-surface text-sm focus:bg-surface"
                />
              </div>

              <VoucherDiscountAmountFields
                discountType={discountType}
                discountValue={discountValue}
                maxDiscount={maxDiscount}
                onDiscountValueChange={setDiscountValue}
                onMaxDiscountChange={setMaxDiscount}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="voucher-min-spend" className="mb-1 block font-bold text-ink">Đơn tối thiểu (VNĐ) <span aria-hidden="true">*</span></label>
                  <Input
                    id="voucher-min-spend"
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-admin-muted-surface text-sm focus-visible:bg-surface focus-visible:outline-none focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary"
                  />
                </div>
                <VoucherRedemptionFields
                  redemptionType={redemptionType}
                  onRedemptionTypeChange={setRedemptionType}
                />
              </div>
              {redemptionType === "CODE" && (
                <div>
                  <label htmlFor="voucher-account-usage" className="mb-1 block font-bold text-ink">
                    Lượt dùng trên mỗi tài khoản <span aria-hidden="true">*</span>
                  </label>
                  <Select items={{ "1": "Một lần mỗi tài khoản", "-1": "Nhiều lần mỗi tài khoản" }} value={usageLimitPerUser} onValueChange={(value) => value && setUsageLimitPerUser(value)}>
                    <SelectTrigger id="voucher-account-usage" className="h-10 w-full rounded-xl border-border-subtle bg-admin-muted-surface text-sm">
                      <SelectValue placeholder="Chọn lượt dùng mỗi khách" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Một lần mỗi tài khoản</SelectItem>
                      <SelectItem value="-1">Nhiều lần mỗi tài khoản</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-text">
                    {usageLimitPerUser === "1"
                      ? "Mỗi tài khoản dùng mã một lần trên cả ba kênh. Ví dụ: Lan đã dùng ở Spa thì không thể dùng lại cho đơn online hoặc bán tại quầy."
                      : usageLimitPerUser === "-1"
                        ? "Một tài khoản có thể dùng mã nhiều lần trên cả ba kênh khi từng giao dịch đủ điều kiện."
                        : "Chọn số lần mỗi tài khoản được dùng; lượt dùng được gộp trên cả ba kênh."} Giới hạn tổng lượt chương trình (nếu có) áp dụng riêng.
                  </p>
                </div>
              )}
              <VoucherRedemptionFollowUp
                redemptionType={redemptionType}
                pointCost={pointCost}
                onPointCostChange={setPointCost}
              />

              <div>
                <label htmlFor="voucher-expiry-date" className="mb-1 block font-bold text-ink">Hạn sử dụng <span aria-hidden="true">*</span></label>
                <Input
                  id="voucher-expiry-date"
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-admin-muted-surface text-sm focus-visible:bg-surface focus-visible:outline-none focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary"
                />
                <p className="mt-1 text-xs text-muted-text">Voucher dùng được hết ngày đã chọn theo giờ Việt Nam.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="h-10 rounded-lg border-border-subtle px-4 text-sm text-muted-text"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 rounded-lg bg-admin-primary px-4 text-sm font-semibold text-white hover:bg-admin-primary-hover"
                >
                  {isCreating ? "Đang tạo..." : "Xác nhận tạo"}
                </Button>
              </div>
            </form>
          </DialogContent>
      </Dialog>
    </>
  );
}
