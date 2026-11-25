"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerFlowProgress, CustomerSiteFrame } from "@/components/layout/customer-ui";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateOrder, type CreateOrderPayload } from "@/hooks/use-orders";
import { getAvailableProductStock } from "@/lib/product-stock";
import { useValidateVoucher } from "@/hooks/use-vouchers";
import { VOUCHER_UNAVAILABLE_MESSAGE } from "@/lib/voucher-messages";
import { useSepayAccountConfig } from "@/hooks/use-payment-config";
import { useActiveDeliveryAreas } from "@/hooks/use-delivery-areas";
import { getProductDetailHref } from "@/lib/product-detail-url";
import { ShoppingBag, Trash2, LogIn, Loader2, X } from "lucide-react";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function CartPage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchProfile } = useAuthStore();
  const { items, updateQuantity, removeItem, clearCart, getSubtotal } = useCartStore();
  const createOrderMutation = useCreateOrder();
  const validateVoucherMutation = useValidateVoucher();
  const orderQrAccountQuery = useSepayAccountConfig("ORDER");
  const deliveryAreasQuery = useActiveDeliveryAreas();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Voucher
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);
  const [appliedVoucherId, setAppliedVoucherId] = useState<string | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) void fetchProfile().catch(() => {});
  }, [isAuthenticated, fetchProfile]);

  const formatVND = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const subtotal = getSubtotal();
  const finalTotal = Math.max(0, subtotal - voucherDiscount);
  const pointsEarned = Math.floor(finalTotal / 10000); // 10.000đ = 1 điểm
  const deliveryAreas = deliveryAreasQuery.data ?? [];
  const selectedArea = deliveryAreas.find((area) => area.id === selectedAreaId);
  const deliveryFee = fulfillmentMethod === "DELIVERY" ? (selectedArea?.fee ?? 0) : 0;
  const totalWithDelivery = finalTotal + deliveryFee;
  const orderQrAccount = orderQrAccountQuery.data;
  const handleApplyVoucher = async () => {
    setVoucherError(null);
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    try {
      const result = await validateVoucherMutation.mutateAsync({
        code,
        orderTotal: subtotal,
      });
      if (result.valid) {
        setAppliedVoucherCode(result.code);
        setAppliedVoucherId(result.voucherId);
        setVoucherDiscount(result.discount);
      }
    } catch (err) {
      setVoucherError(getErrorMessage(err, VOUCHER_UNAVAILABLE_MESSAGE));
    }
  };

  const removeVoucher = () => {
    setAppliedVoucherCode(null);
    setAppliedVoucherId(null);
    setVoucherDiscount(0);
    setCouponInput("");
    setVoucherError(null);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push("/dang-nhap?redirect=/gio-hang");
      return;
    }
    if (appliedVoucherCode && finalTotal <= 0) {
      setVoucherError("Voucher này làm số tiền cần thanh toán còn 0đ. Bạn hãy chọn voucher khác hoặc bỏ voucher.");
      return;
    }
    if (fulfillmentMethod === "DELIVERY" && (!selectedArea || !deliveryAddress.trim() || !contactName.trim() || !contactPhone.trim())) {
      toast.error("Chọn phường/xã và nhập đủ địa chỉ, tên, số điện thoại người nhận.");
      return;
    }

    const orderItems = items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
    }));

    const payload: CreateOrderPayload = {
      items: orderItems,
      paymentMethod: "BANK_TRANSFER",
      fulfillmentMethod,
      deliveryAreaId: fulfillmentMethod === "DELIVERY" ? selectedArea?.id : undefined,
      deliveryAddress: fulfillmentMethod === "DELIVERY" ? deliveryAddress.trim() : undefined,
      expectedDeliveryFee: fulfillmentMethod === "DELIVERY" ? selectedArea?.fee : undefined,
      contactName: fulfillmentMethod === "DELIVERY" ? contactName.trim() : undefined,
      contactPhone: fulfillmentMethod === "DELIVERY" ? contactPhone.trim() : undefined,
      voucherCode: appliedVoucherCode || undefined,
      voucherId: appliedVoucherId || undefined,
    };
    createOrderMutation.mutate(payload, {
      onSuccess: (data) => {
        clearCart();
        router.replace(`/thanh-toan/${encodeURIComponent(data.code)}`);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, "Chưa thể tạo đơn hàng. Bạn thử lại sau ít phút."));
      },
    });
  };

  return (
    <CustomerSiteFrame className="customer-site-frame--focused-flow">
      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-14">
          <CustomerFlowProgress steps={["Giỏ hàng", "Thanh toán"]} currentStep={1} />
          <header className="customer-flow-heading">
            <div><p className="customer-page-intro__eyebrow">Cửa hàng PetCare</p><h1>Giỏ hàng của bạn</h1><p>Kiểm tra sản phẩm, cách nhận hàng và tổng tiền trước khi xác nhận đơn.</p></div>
            <Link href="/cua-hang" className="customer-flow-heading__link">Tiếp tục xem sản phẩm</Link>
          </header>

          {items.length === 0 ? (
            <div className="space-y-4 border-y border-[#DEDAD0] py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F8F5EF] text-[#65716A] mx-auto flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-[#244B3F]" />
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#253B33]">
                Giỏ hàng của bạn đang trống
              </h2>
              <p className="text-xs text-[#65716A] max-w-sm mx-auto">
                Xem các loại thức ăn và phụ kiện đang có tại cửa hàng.
              </p>
              <Link
                href="/cua-hang"
                className="btn-tactile inline-flex min-h-12 items-center rounded-full bg-[#244B3F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1B3C33]"
              >
                Xem cửa hàng
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Items List */}
              <div className="min-w-0 space-y-4 lg:col-span-2">
                <div className="divide-y divide-[#DEDAD0] border-y border-[#DEDAD0]">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-3 p-4 sm:flex sm:items-center sm:gap-4 sm:p-6"
                    >
                      <img
                        src={item.product.imageUrl || "/product-placeholder.svg"}
                        alt={item.product.name}
                        className="size-16 shrink-0 rounded-xl object-cover bg-[#F0EEE6] sm:size-20"
                        onError={(event) => {
                          if (!event.currentTarget.src.endsWith("/product-placeholder.svg")) {
                            event.currentTarget.src = "/product-placeholder.svg";
                          }
                        }}
                      />

                      <div className="min-w-0 sm:flex-1">
                        <Link href={getProductDetailHref(item.product.slug)}>
                          <h3 className="break-words text-sm font-bold leading-snug text-[#253B33] hover:text-[#244B3F]">
                            {item.product.name}
                          </h3>
                        </Link>
                        <div className="text-xs text-[#65716A] mt-0.5">
                          {item.product.categoryLabel}
                        </div>
                        <div className="text-sm font-extrabold text-[#244B3F] mt-2">
                          {formatVND(item.product.price)}
                        </div>
                      </div>

                      {/* Quantity & Delete */}
                      <div className="col-start-2 flex items-center justify-between gap-3 sm:ml-2 sm:flex-col sm:items-end sm:justify-center sm:gap-3 sm:shrink-0">
                        <div className="flex items-center rounded-full border border-[#DEDAD0] bg-[#F8F5EF] p-0.5">
                          <button
                            type="button"
                            aria-label={`Giảm số lượng ${item.product.name}`}
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="size-10 rounded-full bg-white flex items-center justify-center font-semibold text-sm"
                          >
                            -
                          </button>
                          <span className="w-9 text-center text-sm font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Tăng số lượng ${item.product.name}`}
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= getAvailableProductStock(item.product)}
                            className="size-10 rounded-full bg-white flex items-center justify-center font-semibold text-sm"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label={`Xóa ${item.product.name} khỏi giỏ hàng`}
                          onClick={() => removeItem(item.product.id)}
                          className="size-10 inline-flex items-center justify-center rounded-xl text-[#65716A] hover:bg-rose-50 hover:text-red-500 transition-colors"
                          title="Xóa món này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <section className="min-w-0 border-y border-[#DEDAD0] bg-[#F0EEE6] p-4 text-xs space-y-3 sm:p-5" aria-labelledby="fulfillment-title">
                  <h3 id="fulfillment-title" className="font-bold text-[#253B33]">Bạn muốn nhận hàng thế nào?</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[#D4D0C6] bg-[#FFFDF8] p-3">
                      <input type="radio" name="fulfillment" checked={fulfillmentMethod === "PICKUP"} onChange={() => setFulfillmentMethod("PICKUP")} />
                      <span>Nhận tại cửa hàng</span>
                    </label>
                    {deliveryAreas.length > 0 && (
                      <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[#D4D0C6] bg-[#FFFDF8] p-3">
                        <input type="radio" name="fulfillment" checked={fulfillmentMethod === "DELIVERY"} onChange={() => setFulfillmentMethod("DELIVERY")} />
                        <span>Nhân viên PetCare giao</span>
                      </label>
                    )}
                  </div>
                  {deliveryAreasQuery.isError && <p role="alert" className="text-rose-700">Chưa tải được khu vực giao. Bạn vẫn có thể nhận tại cửa hàng.</p>}
                  {fulfillmentMethod === "DELIVERY" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 sm:col-span-2">
                        <span className="font-semibold">Phường/xã được phục vụ</span>
                        <select value={selectedAreaId} onChange={(event) => setSelectedAreaId(event.target.value)} className="w-full min-w-0 rounded-xl border border-[#E5ECE3] bg-white p-3">
                          <option value="">Chọn khu vực giao</option>
                          {deliveryAreas.map((area) => <option key={area.id} value={area.id}>{area.province} — {area.ward} ({formatVND(area.fee)})</option>)}
                        </select>
                      </label>
                      <label className="space-y-1 sm:col-span-2"><span className="font-semibold">Số nhà, đường, địa chỉ chi tiết</span><input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} maxLength={250} className="w-full min-w-0 rounded-xl border border-[#E5ECE3] bg-white p-3" placeholder="Ví dụ: 12 Nguyễn Văn A, ngõ 3" /></label>
                      <label className="space-y-1"><span className="font-semibold">Tên người nhận</span><input value={contactName} onChange={(event) => setContactName(event.target.value)} className="w-full min-w-0 rounded-xl border border-[#E5ECE3] bg-white p-3" /></label>
                      <label className="space-y-1"><span className="font-semibold">Số điện thoại người nhận</span><input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className="w-full min-w-0 rounded-xl border border-[#E5ECE3] bg-white p-3" /></label>
                    </div>
                  )}
                  {fulfillmentMethod === "PICKUP" && <p className="text-[#65716A]">Cửa hàng sẽ thông báo khi đơn sẵn sàng để bạn đến nhận.</p>}
                </section>
              </div>

              {/* Order Summary */}
              <div className="min-w-0 border-y border-[#DEDAD0] bg-[#F0EEE6] p-4 pb-20 sm:sticky sm:top-28 sm:p-6 sm:pb-6">
                <h3 className="font-[family-name:var(--font-display)] font-bold text-lg text-[#253B33]">
                  Tóm tắt đơn hàng
                </h3>

                {/* Voucher Box */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#253B33] mb-1.5">Mã voucher</div>
                  {!appliedVoucherCode ? (
                    <div className="flex min-w-0 gap-2">
                      <input
                        type="text"
                        placeholder="Nhập mã voucher..."
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value); setVoucherError(null); }}
                        className="min-w-0 flex-1 rounded-xl border border-[#DEDAD0] px-3 py-2 text-xs font-medium uppercase focus:border-[#244B3F] focus:outline-hidden sm:px-3.5"
                      />
                      <button
                        onClick={handleApplyVoucher}
                        disabled={validateVoucherMutation.isPending || !couponInput.trim()}
                        className="shrink-0 rounded-full bg-[#244B3F] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1B3C33] disabled:opacity-60 sm:px-4"
                      >
                        {validateVoucherMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Áp dụng"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-[#637650] bg-[#E7ECE0] p-2 rounded-lg font-medium">
                      <span>Đã áp mã <strong>{appliedVoucherCode}</strong> (-{formatVND(voucherDiscount)})</span>
                      <button onClick={removeVoucher} className="text-red-500 hover:underline font-bold ml-2">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {voucherError && (
                    <p className="text-[11px] text-red-600">{voucherError}</p>
                  )}
                  {appliedVoucherCode && finalTotal <= 0 && (
                    <p role="alert" className="text-[11px] text-red-600">
                      Voucher này làm tổng thanh toán còn 0đ. Hãy chọn voucher khác hoặc bỏ voucher để tiếp tục.
                    </p>
                  )}
                </div>

                {isAuthenticated && (
                  <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#E5ECE3] bg-[#F0EEE6] px-3 py-2.5 text-xs">
                    <p className="min-w-0 text-[#65716A]">
                      Bạn có <strong className="tabular-nums text-[#244B3F]">{user?.loyaltyPoints ?? 0} điểm</strong>
                    </p>
                    <Link
                      href="/tai-khoan?tab=points"
                      className="shrink-0 font-bold text-[#244B3F] underline decoration-[#244B3F]/40 underline-offset-4 hover:text-[#1B3C33]"
                    >
                      Đổi voucher
                    </Link>
                  </div>
                )}

                {/* Numbers */}
                <div className="space-y-2.5 text-xs pt-4 border-t border-[#DEDAD0]">
                  <div className="flex items-start justify-between gap-2 text-[#65716A]">
                    <span className="min-w-0">Tạm tính ({items.length} món):</span>
                    <span className="min-w-0 text-right font-semibold text-[#253B33]">{formatVND(subtotal)}</span>
                  </div>

                  {voucherDiscount > 0 && (
                    <div className="flex items-start justify-between gap-2 font-bold text-[#C9684D]">
                      <span className="min-w-0">Giảm giá voucher:</span>
                      <span className="min-w-0 text-right">-{formatVND(voucherDiscount)}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 text-[#65716A]">
                    <span className="min-w-0">Hình thức nhận:</span>
                    <span className="min-w-0 text-right font-semibold text-[#253B33]">{fulfillmentMethod === "DELIVERY" ? "PetCare giao" : "Nhận tại cửa hàng"}</span>
                  </div>
                  {fulfillmentMethod === "DELIVERY" && <div className="flex items-start justify-between gap-2 text-[#65716A]"><span>Phí giao:</span><span className="text-right font-semibold text-[#253B33]">{selectedArea ? formatVND(deliveryFee) : "Chọn khu vực"}</span></div>}

                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-t border-[#DEDAD0] pt-4 text-base font-extrabold text-[#253B33]">
                    <span>Tổng thanh toán:</span>
                    <span className="ml-auto min-w-0 break-words text-right text-xl text-[#244B3F]">{formatVND(totalWithDelivery)}</span>
                  </div>
                  <div className="text-[11px] text-[#637650] font-semibold">
                    Dự kiến tích lũy +{pointsEarned} điểm khi đơn hoàn tất
                  </div>
                </div>

                {/* Checkout CTA */}
                {!isAuthenticated && (
                  <div className="p-3 bg-[#E5ECE3] border border-[#244B3F]/20 rounded-2xl text-[11px] text-[#244B3F] flex items-center gap-2">
                    <LogIn className="w-4 h-4 shrink-0" />
                    <span>Đăng nhập để đặt hàng và nhận điểm khi đơn hoàn tất.</span>
                  </div>
                )}
                {orderQrAccountQuery.isError ? (
                  <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
                    Không tải được thông tin thanh toán. Tải lại trang để thử lại.
                  </p>
                ) : !orderQrAccount?.configured ? (
                  <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                    Thanh toán QR chưa được cấu hình. Hiện chưa thể tiếp nhận đơn hàng trực tuyến.
                  </p>
                ) : null}
                <button
                  onClick={handleCheckout}
                  data-floating-contact-safe-zone
                  disabled={createOrderMutation.isPending || orderQrAccountQuery.isLoading || orderQrAccountQuery.isError || !orderQrAccount?.configured || (Boolean(appliedVoucherCode) && finalTotal <= 0) || (fulfillmentMethod === "DELIVERY" && (!selectedArea || !deliveryAddress.trim() || !contactName.trim() || !contactPhone.trim()))}
                  className="btn-tactile flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#244B3F] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1B3C33] disabled:opacity-70"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang xác nhận...
                    </>
                  ) : orderQrAccountQuery.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra thanh toán...
                    </>
                  ) : !orderQrAccount?.configured ? (
                    "Thanh toán QR chưa sẵn sàng"
                  ) : !isAuthenticated ? (
                    <>
                      <LogIn className="w-4 h-4" /> Đăng nhập để đặt hàng
                    </>
                  ) : (
                    "Xác nhận và thanh toán"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

    </CustomerSiteFrame>
  );
}
