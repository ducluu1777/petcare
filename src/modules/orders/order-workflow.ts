import { FulfillmentMethod, OrderStatus } from '@prisma/client';

export function canAdvanceOrder(
  order: { fulfillmentMethod: FulfillmentMethod; status: OrderStatus; isPaid: boolean },
  target: OrderStatus,
) {
  if (!order.isPaid) return false;
  const allowed: Record<FulfillmentMethod, Partial<Record<OrderStatus, OrderStatus[]>>> = {
    PICKUP: {
      PENDING: [OrderStatus.PROCESSING],
      PROCESSING: [OrderStatus.READY],
      READY: [OrderStatus.COMPLETED],
    },
    DELIVERY: {
      PENDING: [OrderStatus.PROCESSING],
      PROCESSING: [OrderStatus.READY],
      READY: [OrderStatus.IN_DELIVERY],
      IN_DELIVERY: [OrderStatus.DELIVERY_FAILED, OrderStatus.COMPLETED],
      DELIVERY_FAILED: [OrderStatus.IN_DELIVERY],
    },
  };
  return allowed[order.fulfillmentMethod][order.status]?.includes(target) ?? false;
}
