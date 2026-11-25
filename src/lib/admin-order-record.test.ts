import { expect, test } from "bun:test";
import { getOnlineOrderPaymentNotice, getOrderPaymentStatusLabel, getOrderWorkflowAction } from "./admin-order-record";
import type { Order } from "@/hooks/use-orders";

const order = (fulfillmentMethod: Order["fulfillmentMethod"], status: Order["status"], isPaid = true) => ({ source: "ONLINE", fulfillmentMethod, status, isPaid }) as Order;

test("unpaid orders cannot start preparation", () => {
  expect(getOrderWorkflowAction(order("PICKUP", "PENDING", false))).toBeNull();
});

test("cancelled unpaid orders do not show a payment reminder", () => {
  expect(getOnlineOrderPaymentNotice({ source: "ONLINE", status: "CANCELLED", isPaid: false, isPaymentOverdue: false })).toBeNull();
});

test("cancelled unpaid orders show no payment due in the detail summary", () => {
  expect(getOrderPaymentStatusLabel({ status: "CANCELLED", isPaid: false })).toBe("Không phát sinh khoản thu");
});

test("active unpaid orders still show that payment is pending", () => {
  expect(getOrderPaymentStatusLabel({ status: "PENDING", isPaid: false })).toBe("Chưa thanh toán");
});

test("cancelled paid orders show whether a refund is still due or recorded", () => {
  expect(getOrderPaymentStatusLabel({ status: "CANCELLED", isPaid: true }, false)).toBe("Chờ ghi nhận hoàn tiền");
  expect(getOrderPaymentStatusLabel({ status: "CANCELLED", isPaid: true }, true)).toBe("Đã hoàn tiền");
});

test("active unpaid online orders keep the appropriate payment reminder", () => {
  expect(getOnlineOrderPaymentNotice({ source: "ONLINE", status: "PENDING", isPaid: false, isPaymentOverdue: false })).toBe("Chờ thanh toán");
  expect(getOnlineOrderPaymentNotice({ source: "ONLINE", status: "PENDING", isPaid: false, isPaymentOverdue: true })).toBe("Quá hạn");
});

test("delivery order advances through handoff and retry", () => {
  expect(getOrderWorkflowAction(order("DELIVERY", "READY"))?.status).toBe("IN_DELIVERY");
  expect(getOrderWorkflowAction(order("DELIVERY", "IN_DELIVERY"))?.status).toBe("COMPLETED");
  expect(getOrderWorkflowAction(order("DELIVERY", "DELIVERY_FAILED"))?.status).toBe("IN_DELIVERY");
  expect(getOrderWorkflowAction(order("PICKUP", "READY"))?.status).toBe("COMPLETED");
});
