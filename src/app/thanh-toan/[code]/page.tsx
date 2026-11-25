"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock3, Download, Loader2, PackageCheck, QrCode } from "lucide-react";
import { toast } from "sonner";
import { CustomerFlowProgress, CustomerSiteFrame } from "@/components/layout/customer-ui";
import { apiClient } from "@/lib/api-client";
import { buildVietQrImageUrl } from "@/lib/payment-qr";
import { getOrderPaymentState } from "@/lib/order-payment-state";
import { saveImageToDevice } from "@/lib/save-image-to-device";
import { useSepayAccountConfig } from "@/hooks/use-payment-config";
import type { Order } from "@/hooks/use-orders";
import { useAuthStore } from "@/stores/auth-store";

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function formatVietnamDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export default function OrderPaymentPage() {
  const params = useParams<{ code: string }>();
  const orderCode = params.code;
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [now, setNow] = useState(() => Date.now());
  const [isSavingQr, setIsSavingQr] = useState(false);
  const accountQuery = useSepayAccountConfig("ORDER");
  const orderQuery = useQuery({
    queryKey: ["orders", "payment", orderCode],
    queryFn: () => apiClient.get<Order>(`/orders/${encodeURIComponent(orderCode)}`),
    enabled: isAuthenticated && !!orderCode,
    refetchInterval: (query) => {
      const currentOrder = query.state.data;
      return currentOrder?.isPaid || currentOrder?.status === "CANCELLED" ? false : 5000;
    },
  });

  const order = orderQuery.data;
  const paymentState = order ? getOrderPaymentState(order, now) : null;
  const qrImageUrl = order?.paymentCode
    ? buildVietQrImageUrl(accountQuery.data, order.total, `THANHTOAN ${order.paymentCode}`)
    : null;
  const canPay = paymentState === "WAITING" && order?.status === "PENDING" && !!order.paymentCode;

  useEffect(() => {
    if (!order || order.isPaid || order.status === "CANCELLED") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [order?.isPaid, order?.status]);

  const handleSaveQr = async () => {
    if (!qrImageUrl || isSavingQr) return;
    setIsSavingQr(true);
    try {
      const result = await saveImageToDevice(qrImageUrl, `petcare-${orderCode}.png`);
      toast.success(result === "shared" ? "Chọn Lưu hình ảnh để lưu mã QR vào album." : "Đã tải ảnh mã QR về thiết bị.");
    } catch {
      toast.error("Chưa lưu được ảnh. Hãy chạm giữ mã QR để lưu vào album.");
    } finally {
      setIsSavingQr(false);
    }
  };

  return (
    <CustomerSiteFrame className="customer-site-frame--focused-flow">
      <main className="flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-[1200px]">
          <CustomerFlowProgress steps={["Giỏ hàng", "Thanh toán"]} currentStep={2} />
          <Link href="/tai-khoan?tab=orders" className="mb-6 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#244B3F] hover:text-[#1B3C33]">
            <ArrowLeft className="size-4" aria-hidden="true" /> Đơn hàng của tôi
          </Link>

          <header className="customer-flow-heading customer-flow-heading--payment">
            <div><p className="customer-page-intro__eyebrow">Thanh toán đơn hàng</p><h1>Thanh toán đơn {orderCode}</h1><p>Kiểm tra số tiền và quét mã QR bên dưới. Trạng thái đơn sẽ cập nhật khi PetCare nhận được thanh toán.</p></div>
          </header>

          {!isAuthLoading && !isAuthenticated ? (
            <section className="border-y border-[#DEDAD0] bg-[#FFFDF8] p-6 sm:p-9">
              <h2 className="text-lg font-bold text-[#253B33]">Đăng nhập để tiếp tục thanh toán</h2>
              <p className="mt-2 text-sm text-[#65716A]">Đơn hàng và mã thanh toán chỉ hiển thị với tài khoản đã đặt đơn.</p>
              <Link href={`/dang-nhap?redirect=${encodeURIComponent(`/thanh-toan/${orderCode}`)}`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#244B3F] px-5 text-sm font-bold text-white hover:bg-[#1B3C33]">
                Đăng nhập
              </Link>
            </section>
          ) : isAuthLoading || orderQuery.isLoading ? (
            <div className="border-y border-[#DEDAD0] bg-[#FFFDF8] p-10 text-center">
              <Loader2 className="mx-auto size-7 animate-spin text-[#244B3F]" aria-label="Đang tải đơn hàng" />
            </div>
          ) : orderQuery.isError || !order ? (
            <section className="border-y border-[#DEDAD0] bg-[#FFFDF8] p-6 sm:p-9">
              <h2 className="text-lg font-bold text-[#253B33]">Không tìm thấy đơn hàng</h2>
              <p className="mt-2 text-sm text-[#65716A]">Kiểm tra mã đơn hoặc mở đơn trong tài khoản của bạn.</p>
              <button type="button" onClick={() => void orderQuery.refetch()} className="mt-5 min-h-11 rounded-full border border-[#244B3F] px-5 text-sm font-bold text-[#244B3F] hover:bg-[#E5ECE3]">Thử lại</button>
            </section>
          ) : paymentState === "PAID" ? (
            <section className="border-y border-emerald-200 bg-[#FFFDF8] p-6 sm:p-9" aria-live="polite">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="mt-0.5 size-7 shrink-0 text-emerald-600" aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-bold text-[#253B33]">Đã nhận thanh toán</h2>
                  <p className="mt-1 text-sm text-[#65716A]">PetCare đã xác nhận {formatVND(order.total)} cho đơn {order.code}.</p>
                </div>
              </div>
              <Link href="/tai-khoan?tab=orders" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#244B3F] px-5 text-sm font-bold text-white hover:bg-[#1B3C33]">Xem đơn hàng</Link>
            </section>
          ) : paymentState === "CANCELLED" ? (
            <section className="border-y border-rose-200 bg-[#FFFDF8] p-6 sm:p-9" role="alert">
              <h2 className="text-lg font-bold text-[#253B33]">Đơn hàng đã được hủy</h2>
              <p className="mt-2 text-sm text-[#65716A]">Không chuyển khoản theo mã QR cũ. Nếu bạn đã chuyển tiền, vui lòng liên hệ PetCare.</p>
            </section>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
              <section className="min-w-0 border-y border-[#DEDAD0] bg-[#FFFDF8] p-5 sm:border-x sm:p-8">
                {paymentState === "EXPIRED" ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4" role="status">
                    <h2 className="font-bold text-amber-950">Đã hết hạn thanh toán</h2>
                    <p className="mt-1 text-sm leading-relaxed text-amber-900">Đơn đang được cập nhật trạng thái hủy. Không chuyển khoản theo mã QR cũ.</p>
                  </div>
                ) : canPay && qrImageUrl ? (
                  <>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-[#253B33]">Quét mã để thanh toán</h2>
                        <p className="mt-1 text-sm text-[#65716A]">Chuyển đúng số tiền và nội dung bên dưới.</p>
                      </div>
                      <QrCode className="mt-1 size-5 shrink-0 text-[#244B3F]" aria-hidden="true" />
                    </div>
                    <div className="rounded-2xl bg-[#F8F5EF] p-4 text-center sm:p-5">
                      <img src={qrImageUrl} alt={`Mã QR thanh toán đơn ${order.code}`} className="mx-auto aspect-square w-56 max-w-full rounded-xl border border-[#DEDAD0] bg-white object-contain p-2 sm:w-64" />
                      <button type="button" onClick={() => void handleSaveQr()} disabled={isSavingQr} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#244B3F] px-5 text-sm font-bold text-[#244B3F] transition-colors hover:bg-[#E5ECE3] disabled:opacity-60">
                        {isSavingQr ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
                        Lưu mã QR
                      </button>
                    </div>
                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="min-w-0 rounded-xl bg-[#F8F5EF] p-3">
                        <p className="text-xs text-[#65716A]">Số tiền</p>
                        <p className="mt-1 break-words text-lg font-extrabold tabular-nums text-[#244B3F]">{formatVND(order.total)}</p>
                      </div>
                      <div className="min-w-0 rounded-xl bg-[#F8F5EF] p-3">
                        <p className="text-xs text-[#65716A]">Nội dung chuyển khoản</p>
                        <p className="mt-1 break-all font-bold text-[#253B33]">THANHTOAN {order.paymentCode}</p>
                      </div>
                    </div>
                    {accountQuery.data?.configured && (
                      <dl className="mt-4 grid min-w-0 gap-2 rounded-xl border border-[#DEDAD0] p-3 text-sm sm:grid-cols-2">
                        <dt className="text-[#65716A]">Ngân hàng</dt><dd className="min-w-0 break-words font-semibold sm:text-right">{accountQuery.data.bankName}</dd>
                        <dt className="text-[#65716A]">Chủ tài khoản</dt><dd className="min-w-0 break-words font-semibold sm:text-right">{accountQuery.data.accountName}</dd>
                        <dt className="text-[#65716A]">Số tài khoản</dt><dd className="min-w-0 break-all font-semibold tabular-nums sm:text-right">{accountQuery.data.accountNumber}</dd>
                      </dl>
                    )}
                    {order.paymentExpiresAt && (
                      <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                        <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        Đơn tự hủy nếu chưa thanh toán trước {formatVietnamDateTime(order.paymentExpiresAt)}.
                      </p>
                    )}
                  </>
                ) : accountQuery.isLoading ? (
                  <div className="rounded-2xl border border-[#DEDAD0] bg-[#F8F5EF] p-4 text-sm text-[#65716A]" role="status">
                    <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden="true" /> Đang tải thông tin thanh toán
                  </div>
                ) : accountQuery.isError || !accountQuery.data?.configured ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4" role="alert">
                    <h2 className="font-bold text-amber-950">Chưa có mã thanh toán</h2>
                    <p className="mt-1 text-sm text-amber-900">Vui lòng liên hệ PetCare để được hỗ trợ đơn này.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4" role="status">
                    <h2 className="font-bold text-amber-950">Đang cập nhật thanh toán</h2>
                    <p className="mt-1 text-sm text-amber-900">Trang tự kiểm tra trạng thái đơn. Bạn có thể chờ trong giây lát.</p>
                  </div>
                )}
              </section>

              <aside className="min-w-0 border-y border-[#DEDAD0] bg-[#F0EEE6] p-5 sm:p-7">
                <div className="flex items-center gap-2">
                  <PackageCheck className="size-5 text-[#244B3F]" aria-hidden="true" />
                  <h2 className="text-base font-bold text-[#253B33]">Đơn hàng của bạn</h2>
                </div>
                <ul className="mt-4 divide-y divide-[#DEDAD0]">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex min-w-0 items-start justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0 break-words text-[#65716A]">{item.product?.name ?? "Sản phẩm"} <span className="whitespace-nowrap">× {item.quantity}</span></span>
                      <span className="shrink-0 text-right font-semibold tabular-nums text-[#253B33]">{formatVND(item.priceApplied * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 space-y-2 border-t border-[#DEDAD0] pt-4 text-sm">
                  <div className="flex justify-between gap-3 text-[#65716A]"><dt>Tiền hàng</dt><dd className="text-right tabular-nums">{formatVND(order.subtotal)}</dd></div>
                  {order.discount > 0 && <div className="flex justify-between gap-3 text-[#637650]"><dt>Voucher</dt><dd className="text-right tabular-nums">−{formatVND(order.discount)}</dd></div>}
                  {order.fulfillmentMethod === "DELIVERY" && <div className="flex justify-between gap-3 text-[#65716A]"><dt>Phí giao</dt><dd className="text-right tabular-nums">{formatVND(order.deliveryFee)}</dd></div>}
                  <div className="flex justify-between gap-3 border-t border-[#DEDAD0] pt-3 text-base font-extrabold text-[#253B33]"><dt>Tổng thanh toán</dt><dd className="text-right tabular-nums text-[#244B3F]">{formatVND(order.total)}</dd></div>
                </dl>
                {order.fulfillmentMethod === "DELIVERY" && (
                  <div className="mt-4 break-words rounded-xl bg-[#F8F5EF] p-3 text-xs leading-relaxed text-[#65716A]">
                    <p className="font-bold text-[#253B33]">Địa chỉ nhận hàng</p>
                    <p className="mt-1">{[order.deliveryAddress, order.deliveryWard, order.deliveryProvince].filter(Boolean).join(", ")}</p>
                    <p>{order.contactName} · {order.contactPhone}</p>
                  </div>
                )}
                <div className="mt-5 rounded-xl bg-[#F0EEE6] p-3 text-xs text-[#65716A]">
                  <p className="font-bold text-[#253B33]">Trạng thái</p>
                  <p className="mt-1" aria-live="polite">
                    {paymentState === "EXPIRED" ? "Hết hạn thanh toán" : "Chờ thanh toán"}
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </CustomerSiteFrame>
  );
}
