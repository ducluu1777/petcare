"use client";

import { Banknote, Loader2, QrCode, UserRound } from "lucide-react";
import { CounterSaleProductOption, CounterSaleSelectedItem } from "@/components/admin/products/counter-sale-selected-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VOUCHER_UNAVAILABLE_MESSAGE } from "@/lib/voucher-messages";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CounterSaleDialogActions, CounterSaleDialogState } from "@/components/admin/products/counter-sale-dialog.types";

interface CounterSaleFormProps {
  state: CounterSaleDialogState;
  actions: CounterSaleDialogActions;
}

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export function CounterSaleForm({ state, actions }: CounterSaleFormProps) {
  const {
    customer,
    subtotal,
    discount,
    total,
    vouchers,
    vouchersLoading,
    vouchersError,
    selectedVoucher,
    selectedVoucherCode,
    productSearch,
    products,
    productsLoading,
    productsError,
    quantities,
    selectedLines,
    customerPhone,
    customerSearchLoading,
    customerMatches,
    paymentMethod,
    qrAccountLoading,
    qrConfigured,
    creating,
  } = state;
  const voucherMinimumNotMet = Boolean(selectedVoucher && selectedVoucher.minSpend > subtotal);
  const voucherWouldMakeTotalZero = Boolean(selectedVoucher && total <= 0);
  const cannotConfirmSale =
    selectedLines.length === 0 ||
    creating ||
    voucherMinimumNotMet ||
    voucherWouldMakeTotalZero ||
    (paymentMethod === "BANK_TRANSFER" && !qrConfigured);

  return (
    <form onSubmit={actions.onSubmit} className="space-y-5 px-5 py-5 sm:px-6">
      <section className="space-y-2" aria-labelledby="counter-sale-products-heading">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h3 id="counter-sale-products-heading" className="text-sm font-bold text-ink">Sản phẩm</h3>
          <Input
            type="search"
            value={productSearch}
            onChange={(event) => actions.onProductSearchChange(event.target.value)}
            placeholder="Tìm sản phẩm đang bán..."
            aria-label="Tìm sản phẩm cho giao dịch"
            className="h-10 sm:max-w-xs"
          />
        </div>
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border-subtle p-2">
          {productsLoading ? (
            <p className="p-3 text-xs text-muted-text">Đang tải sản phẩm…</p>
          ) : productsError ? (
            <div className="flex items-center justify-between gap-2 p-3 text-xs text-rose-700">
              <span>Không tải được sản phẩm.</span>
              <Button type="button" size="sm" variant="outline" onClick={actions.onRetryProducts} className="h-10">Thử lại</Button>
            </div>
          ) : products.length === 0 ? (
            <p className="p-3 text-xs text-muted-text">Không tìm thấy sản phẩm đang bán.</p>
          ) : products.map((product) => {
            const available = Math.max(0, product.stock - (product.reservedStock ?? 0));
            const quantity = quantities[product.id] ?? 0;
            return (
              <CounterSaleProductOption
                key={product.id}
                product={product}
                quantity={quantity}
                available={available}
                onAdd={() => actions.onQuantityChange(product, 1)}
              />
            );
          })}
        </div>
        {selectedLines.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border-subtle bg-admin-muted-surface p-3">
            {selectedLines.map(({ product, quantity }) => (
              <CounterSaleSelectedItem
                key={product.id}
                product={product}
                quantity={quantity}
                available={Math.max(0, product.stock - (product.reservedStock ?? 0))}
                onDecrease={() => actions.onQuantityChange(product, -1)}
                onIncrease={() => actions.onQuantityChange(product, 1)}
              />
            ))}
            <div className="flex justify-between border-t border-border-subtle pt-2 text-sm font-bold">
              <span>Tạm tính</span>
              <span>{formatVND(subtotal)}</span>
            </div>
            {discount > 0 && selectedVoucher && (
              <div className="flex justify-between text-sm font-medium text-emerald-700">
                <span>Voucher {selectedVoucher.code}</span>
                <span>− {formatVND(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border-subtle pt-2 text-sm font-bold">
              <span>Cần thanh toán</span>
              <span className="text-admin-primary">{formatVND(total)}</span>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2 border-t border-border-subtle pt-4" aria-labelledby="counter-sale-customer-heading">
        <div className="flex items-center justify-between gap-2">
          <h3 id="counter-sale-customer-heading" className="text-sm font-bold text-ink">Khách hàng</h3>
          <span className="text-xs text-muted-text">Khách lẻ không tích điểm và không dùng voucher</span>
        </div>
        {customer ? (
          <div className="flex items-center justify-between rounded-xl border border-admin-qr-border bg-admin-qr-surface p-3 text-sm">
            <div className="flex items-center gap-2">
              <UserRound aria-hidden="true" className="size-4 text-admin-primary" />
              <div>
                <p className="font-semibold text-ink">{customer.name}</p>
                <p className="text-muted-text">{customer.phone || "Chưa có số điện thoại"} · {customer.loyaltyPoints} điểm</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={actions.onRemoveCustomer} className="h-10">Bỏ liên kết</Button>
          </div>
        ) : (
          <>
            <Input
              type="tel"
              inputMode="tel"
              value={customerPhone}
              onChange={(event) => actions.onCustomerPhoneChange(event.target.value)}
              placeholder="Nhập số điện thoại để tìm tài khoản"
              aria-label="Số điện thoại khách hàng"
              className="h-10"
            />
            {customerPhone.trim().length >= 3 && (
              <div className="max-h-32 overflow-y-auto rounded-xl border border-border-subtle">
                {customerSearchLoading ? (
                  <p className="p-3 text-xs text-muted-text">Đang tìm khách hàng…</p>
                ) : customerMatches.length ? customerMatches.map((match) => (
                  <Button
                    key={match.id}
                    type="button"
                    variant="ghost"
                    onClick={() => actions.onSelectCustomer(match)}
                    className="h-auto min-h-10 w-full justify-between rounded-none border-b border-border-subtle px-3 py-2 text-left text-sm last:border-b-0 hover:bg-admin-muted-surface"
                  >
                    <span className="font-semibold text-ink">{match.name}</span>
                    <span className="text-muted-text">{match.phone}</span>
                  </Button>
                )) : (
                  <p className="p-3 text-xs text-muted-text">Không tìm thấy tài khoản bằng số điện thoại này.</p>
                )}
              </div>
            )}
          </>
        )}
        {customer && (
          <div className="space-y-2 rounded-xl border border-border-subtle bg-surface p-3">
            <label htmlFor="counter-sale-voucher" className="text-sm font-semibold text-ink">Voucher</label>
            {vouchersError ? (
              <div className="flex items-center justify-between gap-2 text-xs text-rose-700">
                <span>Không tải được voucher của khách.</span>
                <Button type="button" size="sm" variant="outline" onClick={actions.onRetryVouchers} className="h-10">Thử lại</Button>
              </div>
            ) : (
              <Select
                items={[
                  { value: "__NONE__", label: "Không áp dụng voucher" },
                  ...vouchers.map((voucher) => ({ value: voucher.code, label: voucher.code })),
                ]}
                value={selectedVoucherCode || "__NONE__"}
                onValueChange={(value) => actions.onVoucherChange(value === "__NONE__" ? "" : value || "")}
                disabled={vouchersLoading || vouchers.length === 0}
              >
                <SelectTrigger id="counter-sale-voucher" className="h-10 w-full rounded-lg border-border-subtle bg-admin-muted-surface text-sm">
                  <SelectValue placeholder={vouchersLoading ? "Đang tải voucher…" : "Chọn voucher"} />
                </SelectTrigger>
                <SelectContent className="min-w-[min(32rem,calc(100vw-3rem))]">
                  <SelectItem value="__NONE__">Không áp dụng voucher</SelectItem>
                  {vouchers.map((voucher) => (
                    <SelectItem key={voucher.id} value={voucher.code}>
                      {voucher.code} · Giảm {voucher.discountType === "PERCENTAGE" ? `${voucher.discountValue}%${voucher.maxDiscount ? `, tối đa ${formatVND(voucher.maxDiscount)}` : ""}` : formatVND(voucher.discountValue)} · Đơn từ {formatVND(voucher.minSpend)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedVoucher && total <= 0 ? (
              <p role="alert" className="text-xs leading-relaxed text-amber-800">
                {VOUCHER_UNAVAILABLE_MESSAGE}
              </p>
            ) : selectedVoucher && selectedVoucher.minSpend > subtotal ? (
              <p role="status" className="text-xs leading-relaxed text-amber-800">
                {VOUCHER_UNAVAILABLE_MESSAGE}
              </p>
            ) : selectedVoucher ? (
              <p className="text-xs leading-relaxed text-muted-text">
                Giảm {formatVND(discount)}{selectedVoucher.discountType === "PERCENTAGE" && selectedVoucher.maxDiscount ? ` (tối đa ${formatVND(selectedVoucher.maxDiscount)})` : ""}; đơn tối thiểu {formatVND(selectedVoucher.minSpend)}. Khi QR đang chờ, voucher được giữ tạm và sẽ trở lại tài khoản nếu giao dịch bị hủy hoặc hết hạn.
              </p>
            ) : vouchers.length === 0 && !vouchersLoading ? (
              <p className="text-xs leading-relaxed text-muted-text">Tài khoản này chưa có voucher khả dụng.</p>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-2 border-t border-border-subtle pt-4" aria-labelledby="counter-sale-payment-heading">
        <h3 id="counter-sale-payment-heading" className="text-sm font-bold text-ink">Hình thức thanh toán</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={paymentMethod === "CASH" ? "default" : "outline"} aria-pressed={paymentMethod === "CASH"} onClick={() => actions.onPaymentMethodChange("CASH")} className="h-10">
            <Banknote aria-hidden="true" className="size-4" /> Tiền mặt
          </Button>
          <Button type="button" variant={paymentMethod === "BANK_TRANSFER" ? "default" : "outline"} aria-pressed={paymentMethod === "BANK_TRANSFER"} disabled={qrAccountLoading || !qrConfigured} onClick={() => actions.onPaymentMethodChange("BANK_TRANSFER")} className="h-10">
            <QrCode aria-hidden="true" className="size-4" /> QR
          </Button>
        </div>
        {paymentMethod === "BANK_TRANSFER" && !qrConfigured && (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            Tài khoản nhận QR chưa được cấu hình. Chọn tiền mặt hoặc hoàn thiện cấu hình để dùng QR.
          </p>
        )}
      </section>

      <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
        <Button type="button" variant="outline" onClick={() => actions.onOpenChange(false)} className="h-10">Đóng</Button>
        <Button type="submit" disabled={cannotConfirmSale} className="h-10 bg-admin-primary text-white hover:bg-admin-primary-hover">
          {creating ? (
            <><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Đang ghi nhận…</>
          ) : paymentMethod === "BANK_TRANSFER" ? "Tạo mã QR và giữ hàng" : "Xác nhận đã thu tiền"}
        </Button>
      </div>
    </form>
  );
}
