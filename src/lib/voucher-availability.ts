export type VoucherAvailability = "AVAILABLE" | "SUSPENDED" | "EXPIRED" | "LIMIT_REACHED";

export interface VoucherAvailabilityInput {
  isActive: boolean;
  expiryDate: string;
  usageLimit?: number;
  usageCount?: number;
}

export function getVoucherAvailability(
  voucher: VoucherAvailabilityInput,
  now = Date.now(),
): VoucherAvailability {
  if (!voucher.isActive) return "SUSPENDED";
  if (new Date(voucher.expiryDate).getTime() < now) return "EXPIRED";

  const limit = voucher.usageLimit;
  if (limit !== undefined && limit !== null && limit !== -1 && (voucher.usageCount ?? 0) >= limit) {
    return "LIMIT_REACHED";
  }

  return "AVAILABLE";
}
