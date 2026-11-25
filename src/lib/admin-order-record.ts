import type { Order } from "@/hooks/use-orders";

export interface OrderContact {
  name: string;
  phone: string | null;
  delivery: string;
  note: string | null;
}

export function getOrderContact(order: Order): OrderContact {
  const deliveryMatch = order.note?.match(/^\[Địa chỉ: ([^\]]+)\]\s*/);
  const recipientMatch = order.note?.match(/\[Người nhận:\s*(.*?)\s+-\s*([^\]]*)\]/);
  const note = (order.note ?? "")
    .replace(deliveryMatch?.[0] ?? "", "")
    .replace(recipientMatch?.[0] ?? "", "")
    .trim();
  const pickupLabels = new Set([
    "PICKUP",
    "Nhận tại cửa hàng",
    "Nhận tại cửa hàng khi đón thú cưng",
  ]);
  const shippingAddress = order.shippingAddress?.trim();
  const legacyAddress = deliveryMatch?.[1]?.trim();
  const structuredAddress = shippingAddress && !pickupLabels.has(shippingAddress)
    ? shippingAddress
    : null;
  const currentDelivery = order.fulfillmentMethod === "DELIVERY"
    ? [order.deliveryAddress, order.deliveryWard, order.deliveryProvince].filter(Boolean).join(", ")
    : null;

  return {
    name: order.contactName?.trim() || recipientMatch?.[1]?.trim() || order.customer?.name || (order.source === "IN_STORE" ? "Khách lẻ" : "Khách mua hàng"),
    phone: order.contactPhone?.trim() || recipientMatch?.[2]?.trim() || order.customer?.phone || null,
    delivery: currentDelivery || structuredAddress || legacyAddress || (order.source === "IN_STORE" ? "Bán tại quầy" : "Nhận tại cửa hàng"),
    note: note || null,
  };
}

export function getOrderWorkflowAction(order: Order): { status: Order["status"]; label: string } | null {
  if (order.source !== "ONLINE" || !order.isPaid) return null;

  switch (order.status) {
    case "PENDING":
      return { status: "PROCESSING", label: "Bắt đầu xử lý" };
    case "PROCESSING":
      return { status: "READY", label: order.fulfillmentMethod === "DELIVERY" ? "Sẵn sàng giao" : "Sẵn sàng nhận" };
    case "READY":
      return order.fulfillmentMethod === "DELIVERY"
        ? { status: "IN_DELIVERY", label: "Bắt đầu giao" }
        : { status: "COMPLETED", label: "Xác nhận khách đã nhận" };
    case "IN_DELIVERY":
      return { status: "COMPLETED", label: "Xác nhận đã giao" };
    case "DELIVERY_FAILED":
      return { status: "IN_DELIVERY", label: "Giao lại" };
    default:
      return null;
  }
}

export function getOnlineOrderPaymentNotice(order: Pick<Order, "source" | "status" | "isPaid" | "isPaymentOverdue">): string | null {
  if (order.source !== "ONLINE" || order.status === "CANCELLED" || order.isPaid) return null;
  return order.isPaymentOverdue ? "Quá hạn" : "Chờ thanh toán";
}

export function getOrderPaymentStatusLabel(order: Pick<Order, "status" | "isPaid">, hasRefund = false): string {
  if (order.status === "CANCELLED") {
    if (hasRefund) return "Đã hoàn tiền";
    return order.isPaid ? "Chờ ghi nhận hoàn tiền" : "Không phát sinh khoản thu";
  }
  return order.isPaid ? "Đã thu tiền" : "Chưa thanh toán";
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  MOMO: "MoMo",
  VNPAY: "VNPay",
};

export function getOrderPaymentMethodLabel(paymentMethod: string | null | undefined) {
  if (!paymentMethod) return "Chưa chọn";
  return paymentMethodLabels[paymentMethod] ?? "Phương thức khác";
}

export function formatAdminOrderAmount(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}
