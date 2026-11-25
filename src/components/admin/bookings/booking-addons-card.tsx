import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceItem } from "@/hooks/use-services";
import type { BookingRecord } from "@/lib/admin-booking-record";

interface BookingAddonsCardProps {
  booking: BookingRecord;
  addonServices: ServiceItem[];
  isOpen: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onAdd: (serviceId: string) => void;
  onRemove: (itemId: string) => void;
}

export function BookingAddonsCard({
  booking,
  addonServices,
  isOpen,
  isUpdating,
  onToggle,
  onAdd,
  onRemove,
}: BookingAddonsCardProps) {
  const canEdit = ["WAITING_CHECKIN", "ARRIVED", "IN_PROGRESS"].includes(booking.status);
  if (!canEdit) return null;

  const addedAddons = booking.service.items.filter((item) => item.isAddon);
  const availableAddons = addonServices.filter(
    (addon) => !booking.service.items.some((item) => item.serviceId === addon.id),
  );

  return (
    <section aria-labelledby="booking-addons-title" className="space-y-4 rounded-xl border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="booking-addons-title" className="text-sm font-semibold text-ink">Dịch vụ bổ sung</h3>
          <p className="mt-1 text-xs text-muted-text">Khoản này sẽ được cộng vào hóa đơn của lịch.</p>
        </div>
        <Button type="button" onClick={onToggle} variant="outline" className="h-10 gap-1.5 rounded-lg border-primary/30 px-3 text-sm font-semibold text-primary hover:bg-teal-50">
          <Plus aria-hidden="true" className="size-3.5" />
          {isOpen ? "Đóng" : "Chọn dịch vụ"}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700">Đang có trong lịch</p>
        {addedAddons.length > 0 ? addedAddons.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-slate-50 px-3 py-2.5">
            <span className="min-w-0 truncate text-sm text-ink">{item.name}</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-semibold tabular-nums text-ink">{item.price.toLocaleString("vi-VN")}₫</span>
              <Button
                type="button"
                disabled={isUpdating}
                onClick={() => onRemove(item.id)}
                variant="ghost"
                className="h-10 rounded-md px-2 text-sm font-medium text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                aria-label={`Gỡ ${item.name} khỏi lịch`}
              >
                {isUpdating ? "Đang lưu…" : "Gỡ"}
              </Button>
            </div>
          </div>
        )) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-muted-text">Chưa có dịch vụ thêm.</p>
        )}
      </div>

      {isOpen && (
        <div className="space-y-2 border-t border-border-subtle pt-3">
          <p className="text-xs font-medium text-slate-700">Có thể thêm</p>
          {availableAddons.map((addon) => (
            <div key={addon.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{addon.name}</p>
                <p className="mt-0.5 text-xs text-muted-text">Giá tính theo cân nặng của {booking.pet.name}.</p>
              </div>
              <Button type="button" disabled={isUpdating} onClick={() => onAdd(addon.id)} className="h-10 shrink-0 rounded-lg px-3 text-sm font-semibold">
                {isUpdating ? "Đang thêm…" : "Thêm"}
              </Button>
            </div>
          ))}
          {addonServices.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-muted-text">Hiện chưa có dịch vụ thêm nào để chọn.</p>
          )}
          {addonServices.length > 0 && availableAddons.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-muted-text">Tất cả dịch vụ đang có đã được thêm vào lịch.</p>
          )}
        </div>
      )}
    </section>
  );
}
