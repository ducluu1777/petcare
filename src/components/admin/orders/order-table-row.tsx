import { Eye, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Order } from "@/hooks/use-orders";
import { formatAdminOrderAmount, getOnlineOrderPaymentNotice, getOrderContact, getOrderPaymentMethodLabel, getOrderWorkflowAction } from "@/lib/admin-order-record";

interface OrderTableRowProps {
  order: Order;
  isUpdating: boolean;
  onView: () => void;
  onAdvance: (status: Order["status"], label: string) => void;
}

function OrderStatusBadge({ order }: { order: Order }) {
  const status = order.status;
  const styles: Record<Order["status"], string> = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-800",
    PROCESSING: "border-blue-200 bg-blue-50 text-blue-700",
    READY: "border-purple-200 bg-purple-50 text-purple-700",
    IN_DELIVERY: "border-blue-200 bg-blue-50 text-blue-700",
    DELIVERY_FAILED: "border-rose-200 bg-rose-50 text-rose-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
  };
  const labels: Record<Order["status"], string> = {
    PENDING: "Chờ xử lý",
    PROCESSING: "Đang xử lý",
    READY: order.fulfillmentMethod === "DELIVERY" ? "Sẵn sàng giao" : "Sẵn sàng nhận",
    IN_DELIVERY: "Đang giao",
    DELIVERY_FAILED: "Giao thất bại",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
  };
  const label = status === "CANCELLED" && order.cancellationReason?.startsWith("Tự hủy: quá hạn thanh toán")
    ? "Tự hủy quá hạn"
    : labels[status];

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[status]}`}>
      {label}
    </span>
  );
}

export function OrderTableRow({ order, isUpdating, onView, onAdvance }: OrderTableRowProps) {
  const contact = getOrderContact(order);
  const orderCode = order.code || `DH-${order.id.slice(0, 6).toUpperCase()}`;
  const itemsCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const workflowAction = getOrderWorkflowAction(order);
  const hasRefund = order.transactions?.some((transaction) => transaction.type === "REFUND") ?? false;
  const paymentNotice = getOnlineOrderPaymentNotice(order);
  const paymentLabel = order.status === "CANCELLED"
    ? hasRefund ? "Đã hoàn tiền" : order.isPaid ? "Chờ ghi nhận hoàn tiền" : "Không phát sinh khoản thu"
    : order.isPaid ? "Đã thanh toán" : order.isPaymentOverdue ? "Quá hạn thanh toán" : "Chờ thanh toán";

  return (
    <TableRow className="transition-colors hover:bg-admin-muted-surface/60">
      <TableCell className="px-4 py-3.5 font-bold text-admin-primary">
        <div>{orderCode}</div>
        <div className="mt-0.5 text-xs font-medium text-muted-text">
          {order.source === "IN_STORE" ? "Bán tại quầy" : order.fulfillmentMethod === "DELIVERY" ? "Giao bởi PetCare" : "Nhận tại cửa hàng"}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <div className="font-bold text-ink">{contact.name}</div>
        {contact.phone && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-text">
            <Phone aria-hidden="true" className="size-3" /> {contact.phone}
          </div>
        )}
        {contact.delivery && (
          <div className="mt-0.5 max-w-xs truncate text-xs text-admin-muted">{contact.delivery}</div>
        )}
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <span className="font-bold text-ink">{itemsCount} món</span>
        <div className="max-w-xs truncate text-xs text-muted-text">
          {order.items?.map((item) => item.product?.name || "Sản phẩm").join(", ")}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <div className="font-bold text-ink">{formatAdminOrderAmount(order.total)}</div>
        {order.discount > 0 && (
          <div className="text-xs font-medium text-emerald-600">
            Giảm: {formatAdminOrderAmount(order.discount)}
          </div>
        )}
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-ink">
            {getOrderPaymentMethodLabel(order.paymentMethod)}
          </span>
          <span className={`size-1.5 rounded-full ${order.status === "CANCELLED" ? "bg-slate-300" : order.isPaid ? "bg-emerald-500" : "bg-amber-500"}`} />
        </div>
        <span className={`text-xs ${order.status === "CANCELLED" && order.isPaid && !hasRefund ? "font-semibold text-amber-800" : "text-muted-text"}`}>{paymentLabel}</span>
      </TableCell>
      <TableCell className="px-4 py-3.5"><OrderStatusBadge order={order} /></TableCell>
      <TableCell className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            onClick={onView}
            variant="ghost"
            size="icon"
            className="size-10 rounded-lg bg-admin-muted-surface p-1.5 text-ink hover:bg-border-subtle"
            aria-label={`Xem chi tiết đơn ${orderCode}`}
            title="Xem chi tiết"
          >
            <Eye aria-hidden="true" className="size-4" />
          </Button>
          {workflowAction && (
            <Button
              type="button"
              onClick={() => onAdvance(workflowAction.status, workflowAction.label)}
              disabled={isUpdating}
              aria-label={`${workflowAction.label} cho đơn ${orderCode}`}
              className="h-10 rounded-lg bg-admin-primary px-3 text-sm font-semibold text-white shadow-2xs hover:bg-admin-primary-hover"
            >
              {workflowAction.label}
            </Button>
          )}
          {paymentNotice && (
            <span className="text-xs font-semibold text-amber-800" title="Chỉ xác nhận khách đã nhận sau khi đơn được thanh toán.">
              {paymentNotice}
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
