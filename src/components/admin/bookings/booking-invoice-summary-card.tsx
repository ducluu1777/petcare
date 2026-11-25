import { Receipt, Tag } from "lucide-react";
import type { BookingRecord } from "@/lib/admin-booking-record";
import { getBookingAmountDue } from "@/lib/booking-payment-presentation";

interface BookingInvoiceSummaryCardProps {
  booking: BookingRecord;
  voucherCode: string;
  voucherDiscount: number;
  isPaid: boolean;
  remainingAmount: number;
}

function formatVND(amount: number) {
  return `${amount.toLocaleString("vi-VN")}₫`;
}

export function getInvoicePromotionDiscount(discount: number, voucherDiscount: number, isPaid: boolean) {
  return Math.max(0, discount - (isPaid ? voucherDiscount : 0));
}

export function BookingInvoiceSummaryCard({
  booking,
  voucherCode,
  voucherDiscount,
  isPaid,
  remainingAmount,
}: BookingInvoiceSummaryCardProps) {
  const invoicePromotionDiscount = getInvoicePromotionDiscount(
    booking.financial.discount,
    voucherDiscount,
    isPaid,
  );
  const isCancelled = booking.status === "CANCELLED";
  const amountDue = getBookingAmountDue(booking.status, booking.statusV2, isPaid, remainingAmount);

  return (
    <section aria-labelledby="booking-invoice-title" className="space-y-4 rounded-xl border border-border-subtle bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <h4 id="booking-invoice-title" className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-700">
          <Receipt aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span>Chi tiết hóa đơn</span>
        </h4>
      </div>
      {isCancelled && <p className="text-xs font-medium text-rose-700">Lịch đã hủy — không còn khoản cần thu.</p>}

      <div className="space-y-2.5 text-sm">
        {booking.financial.serviceRemainingAmount === 0 && booking.financial.finalAmount > 0 && (
          <p className="text-xs font-medium text-emerald-700">Dịch vụ đã thanh toán trước.</p>
        )}
        {booking.service.items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-2 py-0.5">
            <div className="pr-2">
              <p className="flex items-center gap-1.5 font-medium text-ink">
                <span>{item.name}</span>
                {item.isAddon && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                    Dịch vụ bổ sung
                  </span>
                )}
              </p>
              {item.note && <span className="block text-xs text-muted-text">{item.note}</span>}
            </div>
            <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-ink">{formatVND(item.price)}</span>
          </div>
        ))}

        <div className="space-y-2 border-t border-border-subtle pt-3 text-sm">
          <div className="flex justify-between gap-2 text-muted-text">
            <span className="whitespace-nowrap">Tạm tính:</span>
            <span className="shrink-0 whitespace-nowrap font-medium tabular-nums text-ink">{formatVND(booking.financial.subtotal)}</span>
          </div>

          {invoicePromotionDiscount > 0 && (
            <div className="flex justify-between gap-2 font-semibold text-emerald-700">
              <span className="whitespace-nowrap">Ưu đãi trên phiếu:</span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">− {formatVND(invoicePromotionDiscount)}</span>
            </div>
          )}

          {voucherDiscount > 0 && (
            <div className="flex justify-between gap-2 font-bold text-emerald-600">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Tag aria-hidden="true" className="size-3.5" /> Giảm voucher ({voucherCode}):
              </span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">− {formatVND(voucherDiscount)}</span>
            </div>
          )}

          {booking.latePickupFeeAmount > 0 && (
            <div className="flex justify-between gap-2 font-semibold text-amber-800">
              <span>Chăm giữ sau giờ đóng cửa{booking.latePickupFeePaid ? " (đã thu)" : ""}:</span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">{formatVND(booking.latePickupFeeAmount)}</span>
            </div>
          )}

          {booking.latePickupFeeAmount > 0 && booking.financial.serviceRemainingAmount === 0 && (
            <p className="text-xs text-muted-text">Dịch vụ đã thanh toán trước; lần này chỉ thu phí chăm giữ.</p>
          )}
          {booking.latePickupFeeAmount > 0 && !booking.latePickupFeePaid && booking.financial.serviceRemainingAmount > 0 && (
            <p className="text-xs text-muted-text">Thu tổng một lần; điểm chỉ tính trên tiền dịch vụ sau ưu đãi/voucher.</p>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2 rounded-xl border border-teal-200 border-t-2 border-t-border-subtle bg-teal-50/60 p-3">
          <span className="block whitespace-nowrap text-sm font-bold text-slate-800">
            {isCancelled
              ? "Không còn phải thu:"
              : booking.financial.serviceRemainingAmount === 0 && booking.latePickupFeeAmount > 0 && !booking.latePickupFeePaid
              ? "Phí còn phải thu:"
              : "Còn phải thu:"}
          </span>
          <span className="shrink-0 whitespace-nowrap text-2xl font-black tabular-nums text-primary">
            {formatVND(amountDue)}
          </span>
        </div>
      </div>
    </section>
  );
}
