import { Button } from "@/components/ui/button";

interface SpaBookingPromotionPanelProps {
  isLoading: boolean;
  hasError: boolean;
  isActive: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onRetry: () => void;
}

export function SpaBookingPromotionPanel({
  isLoading,
  hasError,
  isActive,
  isUpdating,
  onToggle,
  onRetry,
}: SpaBookingPromotionPanelProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="space-y-1">
        <h2 className="font-semibold text-ink">Ưu đãi đặt lịch Spa</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-text">
          Giảm 5% tại quầy sau khi hoàn tất dịch vụ, kèm kiểm tra da/tai miễn phí và một gói hạt phù hợp. Nếu khách chọn voucher, voucher thay cho mức giảm 5%; không cộng dồn. Tạm ngưng chỉ ảnh hưởng booking mới, lịch đã đủ điều kiện vẫn giữ ưu đãi.
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {isLoading ? (
          <span role="status" className="text-xs text-muted-text">Đang tải trạng thái ưu đãi…</span>
        ) : hasError ? (
          <div className="flex items-center gap-2">
            <span role="alert" className="text-xs text-red-700">Không tải được trạng thái ưu đãi.</span>
            <Button type="button" variant="link" onClick={onRetry} className="h-auto p-0 text-sm font-semibold text-admin-primary">
              Tải lại trạng thái
            </Button>
          </div>
        ) : (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
            {isActive ? "Đang áp dụng" : "Đang tạm ngưng"}
          </span>
        )}
        <Button
          type="button"
          variant={isActive ? "outline" : "default"}
          disabled={isLoading || hasError || isUpdating}
          onClick={onToggle}
          className="h-10 rounded-lg px-4 text-sm font-semibold"
        >
          {isUpdating
            ? "Đang cập nhật…"
            : isActive
              ? "Tạm ngưng ưu đãi"
              : "Bật ưu đãi"}
        </Button>
      </div>
    </section>
  );
}
