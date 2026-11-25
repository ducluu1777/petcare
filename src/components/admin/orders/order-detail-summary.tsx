import { MapPin, Phone, User } from "lucide-react";
import type { Order } from "@/hooks/use-orders";
import type { OrderContact } from "@/lib/admin-order-record";
import { formatAdminOrderAmount, getOrderPaymentStatusLabel } from "@/lib/admin-order-record";

interface OrderCustomerPaymentSummaryProps {
  order: Order;
  contact: OrderContact;
  hasRefund: boolean;
}

export function OrderCustomerPaymentSummary({ order, contact, hasRefund }: OrderCustomerPaymentSummaryProps) {
  return (
    <>
      <div className="space-y-1.5 rounded-xl border border-border-subtle bg-admin-muted-surface p-3">
        <div className="flex items-center gap-1.5 font-bold text-ink">
          <User aria-hidden="true" className="size-3.5 text-admin-primary" />
          <span>{contact.name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-text">
          <Phone aria-hidden="true" className="size-3.5 text-admin-primary" />
          <span>{contact.phone || "Chưa có số điện thoại"}</span>
        </div>
        {order.fulfillmentMethod === "DELIVERY" && <p className="text-xs font-semibold text-admin-primary">Nhân viên PetCare giao hàng</p>}
        {order.isPaymentOverdue && <p role="status" className="rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-900">Quá hạn 24 giờ. Đơn sẽ tự hủy; nếu khách đã chuyển khoản, kiểm tra giao dịch trong SePay.</p>}
        <div className="flex items-center gap-1.5 text-muted-text">
          <MapPin aria-hidden="true" className="size-3.5 text-admin-primary" />
          <span>{contact.delivery ? `Thông tin nhận: ${contact.delivery}` : "Chưa có thông tin nhận đơn"}</span>
        </div>
        {contact.note && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <strong>Ghi chú:</strong> {contact.note}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border-subtle px-3 py-2.5 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-muted-text">Thanh toán</span>
          <span className="font-semibold text-ink">{getOrderPaymentStatusLabel(order, hasRefund)}</span>
        </div>
        {order.isPaid && order.transactions?.filter((transaction) => transaction.type === "FINAL_PAYMENT").map((transaction) => (
          <div key={transaction.id} className="mt-2 space-y-1 border-t border-border-subtle pt-2 text-xs text-muted-text">
            <p className="break-words">Mã giao dịch đại diện: <strong className="break-all text-ink">{transaction.externalId ?? "Không có"}</strong></p>
            {transaction.receivedAmount !== null && transaction.receivedAmount !== undefined && (
              <p>Tiền nhận: <strong className="text-ink">{formatAdminOrderAmount(transaction.receivedAmount)}</strong></p>
            )}
            {transaction.confirmedBy?.name && <p>Người xác nhận: <strong className="text-ink">{transaction.confirmedBy.name}</strong></p>}
            {transaction.note && <p className="break-words">{transaction.note}</p>}
          </div>
        ))}
        {order.status === "CANCELLED" && (
          <div className="mt-1.5 space-y-1 text-muted-text">
            <p>{hasRefund
              ? "Đã ghi nhận khoản hoàn tiền cho khách."
              : !order.isPaid
                ? "Đơn đã hủy, chưa phát sinh tiền cần hoàn. Hàng và voucher đã được trả."
                : "Đơn đã thu tiền. Chỉ ghi nhận hoàn sau khi đã chuyển tiền cho khách."}</p>
            {order.cancellationReason && <p className="break-words"><strong className="text-ink">Lý do hủy:</strong> {order.cancellationReason}</p>}
          </div>
        )}
      </div>
    </>
  );
}

export function OrderItemsAndTotals({ order }: { order: Order }) {
  return (
    <>
      <div>
        <h4 className="mb-2 font-bold text-ink">Danh sách sản phẩm ({order.items?.length || 0})</h4>
        <div className="space-y-2 rounded-xl border border-border-subtle p-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-border-subtle/60 pb-2 last:border-none last:pb-0">
              <div>
                <div className="font-bold text-ink">{item.product?.name || "Sản phẩm"}</div>
                <div className="text-xs text-muted-text">
                  {formatAdminOrderAmount(item.priceApplied)} x {item.quantity}
                </div>
              </div>
              <div className="font-bold text-ink">{formatAdminOrderAmount(item.priceApplied * item.quantity)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1 border-t border-border-subtle pt-2">
        <div className="flex justify-between text-muted-text">
          <span>Tạm tính:</span>
          <span>{formatAdminOrderAmount(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between font-bold text-emerald-600">
            <span>Giảm giá / Voucher:</span>
            <span>-{formatAdminOrderAmount(order.discount)}</span>
          </div>
        )}
        {order.fulfillmentMethod === "DELIVERY" && <div className="flex justify-between text-muted-text"><span>Phí giao:</span><span>{formatAdminOrderAmount(order.deliveryFee ?? 0)}</span></div>}
        <div className="flex justify-between border-t border-border-subtle pt-1 text-sm font-black text-ink">
          <span>Tổng thanh toán:</span>
          <span className="text-admin-primary">{formatAdminOrderAmount(order.total)}</span>
        </div>
      </div>
    </>
  );
}
