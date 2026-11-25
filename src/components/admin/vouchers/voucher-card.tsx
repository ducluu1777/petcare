import { Calendar, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VoucherItem } from "@/hooks/use-vouchers";
import { getVoucherAvailability } from "@/lib/voucher-availability";
import { formatLoyaltyCopy } from "@/lib/loyalty-copy";

interface VoucherCardProps {
  voucher: VoucherItem;
  onToggleActive: (voucher: VoucherItem) => void;
  onEdit: (voucher: VoucherItem) => void;
}

function formatVND(price: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

export function VoucherCard({ voucher, onToggleActive, onEdit }: VoucherCardProps) {
  const isPercent = voucher.discountType === "PERCENTAGE";
  const availability = getVoucherAvailability(voucher);
  const availabilityLabel = {
    AVAILABLE: "Đang dùng được",
    SUSPENDED: "Tạm ngưng",
    EXPIRED: "Hết hạn",
    LIMIT_REACHED: "Hết lượt dùng",
  }[availability];
  const availabilityClassName = availability === "AVAILABLE"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : availability === "EXPIRED" || availability === "LIMIT_REACHED"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <article className="flex flex-col justify-between space-y-4 rounded-2xl border border-border-subtle bg-surface p-5 shadow-2xs transition-all hover:border-admin-primary/30">
      <div>
        <div className="flex items-center justify-between">
          <span className="rounded-lg border border-admin-primary/20 bg-admin-primary-light px-2.5 py-1 text-xs font-bold tracking-wider text-admin-primary">
            {voucher.code}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-bold ${availabilityClassName}`}
          >
            {availabilityLabel}
          </span>
        </div>

        <h3 className="mt-3 text-base font-bold text-ink">{formatLoyaltyCopy(voucher.title)}</h3>
        {voucher.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-text">{formatLoyaltyCopy(voucher.description)}</p>
        )}

        <dl className="mt-3 space-y-1 rounded-xl border border-border-subtle bg-admin-muted-surface p-3 text-xs">
          <div className="flex justify-between gap-3 text-muted-text">
            <dt>Mức giảm:</dt>
            <dd className="text-right font-bold text-admin-primary">
              {isPercent
                ? `${voucher.discountValue}%${voucher.maxDiscount != null ? ` (Tối đa ${formatVND(voucher.maxDiscount)})` : ""}`
                : formatVND(voucher.discountValue)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 text-muted-text">
            <dt>Đơn tối thiểu:</dt>
            <dd className="font-bold text-ink">{formatVND(voucher.minSpend)}</dd>
          </div>
          <div className={`flex justify-between gap-3 ${voucher.pointCost ? "text-amber-800" : "text-muted-text"}`}>
            <dt>Hình thức:</dt>
            <dd className="text-right font-bold">{voucher.pointCost ? `Đổi ${voucher.pointCost} điểm` : "Dùng mã voucher"}</dd>
          </div>
          <div className="flex justify-between gap-3 text-muted-text">
            <dt>Tổng lượt đã dùng:</dt>
            <dd className="font-bold text-ink">
              {(voucher.usageCount ?? 0).toLocaleString("vi-VN")} / {voucher.usageLimit === -1 || voucher.usageLimit == null ? "Không giới hạn" : voucher.usageLimit.toLocaleString("vi-VN")}
            </dd>
          </div>
          {voucher.pointCost == null && (
            <div className="flex justify-between gap-3 text-muted-text">
              <dt>Lượt mỗi tài khoản:</dt>
              <dd className="font-bold text-ink">{voucher.usageLimitPerUser === -1 ? "Nhiều lần" : "Một lần"}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3 text-xs">
        <span className="flex items-center gap-1 text-xs text-admin-muted">
          <Calendar aria-hidden="true" className="size-3.5" />
          Hạn dùng: {new Date(voucher.expiryDate).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => onEdit(voucher)}
            variant="outline"
            size="sm"
            className="h-10 rounded-lg border-border-subtle px-3 text-sm text-admin-text-emphasis"
          >
            <Pencil aria-hidden="true" className="size-3.5" />
            Sửa hạn / lượt
          </Button>
          <Button
            type="button"
            onClick={() => onToggleActive(voucher)}
            variant="outline"
            size="sm"
            className="h-10 rounded-lg border-border-subtle px-3 text-sm text-admin-primary"
          >
            {voucher.isActive ? "Tạm ngưng" : "Bật lại"}
          </Button>
        </div>
      </div>
    </article>
  );
}
