import { describe, expect, it } from 'vitest';
import { canAdvanceOrder } from './order-workflow.js';

describe('online order workflow', () => {
  it('does not prepare an unpaid order', () => {
    expect(canAdvanceOrder({ fulfillmentMethod: 'PICKUP', status: 'PENDING', isPaid: false }, 'PROCESSING')).toBe(false);
  });

  it('keeps pickup and delivery branches separate', () => {
    expect(canAdvanceOrder({ fulfillmentMethod: 'PICKUP', status: 'READY', isPaid: true }, 'COMPLETED')).toBe(true);
    expect(canAdvanceOrder({ fulfillmentMethod: 'DELIVERY', status: 'READY', isPaid: true }, 'COMPLETED')).toBe(false);
    expect(canAdvanceOrder({ fulfillmentMethod: 'DELIVERY', status: 'READY', isPaid: true }, 'IN_DELIVERY')).toBe(true);
  });

  it('can retry a failed delivery', () => {
    expect(canAdvanceOrder({ fulfillmentMethod: 'DELIVERY', status: 'IN_DELIVERY', isPaid: true }, 'DELIVERY_FAILED')).toBe(true);
    expect(canAdvanceOrder({ fulfillmentMethod: 'DELIVERY', status: 'DELIVERY_FAILED', isPaid: true }, 'IN_DELIVERY')).toBe(true);
  });
});
