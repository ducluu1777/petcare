import { Clock3, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeekdayHoursRow, type DayHours } from "@/components/admin/time-slots/weekday-hours-row";

interface ScheduleWeekday {
  key: string;
  label: string;
}

interface ScheduleHoursEditorProps {
  weekdays: ReadonlyArray<ScheduleWeekday>;
  openHours: Record<string, DayHours>;
  capacity: number;
  latePickupFeeAmount: number;
  hasDefaultSpaHours: boolean;
  isSaving: boolean;
  canSave: boolean;
  readOnly: boolean;
  invalidHours: boolean;
  savedMessage: string;
  saveError?: string;
  onApplyDefaultSpaHours: () => void;
  onToggleDay: (key: string, isOpen: boolean) => void;
  onOpenChange: (key: string, value: string) => void;
  onCloseChange: (key: string, value: string) => void;
  onCapacityChange: (value: number) => void;
  onLatePickupFeeAmountChange: (value: number) => void;
}

export function ScheduleHoursEditor({
  weekdays,
  openHours,
  capacity,
  latePickupFeeAmount,
  hasDefaultSpaHours,
  isSaving,
  canSave,
  readOnly,
  invalidHours,
  savedMessage,
  saveError,
  onApplyDefaultSpaHours,
  onToggleDay,
  onOpenChange,
  onCloseChange,
  onCapacityChange,
  onLatePickupFeeAmountChange,
}: ScheduleHoursEditorProps) {
  return (
    <section className="rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-teal-50 p-2 text-primary"><Clock3 className="h-5 w-5" /></span>
          <div>
            <h2 className="font-semibold text-ink">Giờ mở cửa theo ngày</h2>
            <p className="text-xs text-muted-text">Ngày nghỉ riêng được quản lý ở danh sách bên cạnh.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={readOnly || hasDefaultSpaHours || isSaving}
          onClick={onApplyDefaultSpaHours}
          className="h-10 rounded-lg border-border-subtle px-3 text-sm font-semibold text-ink"
        >
          Điền giờ Spa mặc định · 08:30–18:30
        </Button>
      </div>

      <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
        {weekdays.map(({ key, label }) => {
          const hours = openHours[key];
          return (
            <WeekdayHoursRow
              key={key}
              label={label}
              hours={hours}
              readOnly={readOnly}
              onToggle={(checked) => onToggleDay(key, checked)}
              onOpenChange={(value) => onOpenChange(key, value)}
              onCloseChange={(value) => onCloseChange(key, value)}
            />
          );
        })}
      </div>

      <div className="mt-5 max-w-lg">
        <label className="block rounded-lg border border-border-subtle bg-slate-50 p-3 text-sm font-medium text-slate-700">
          Số lịch tối đa trong mỗi khung 30 phút <span aria-hidden="true">*</span>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              step={1}
              required
              value={capacity}
              disabled={readOnly}
              onChange={(event) => onCapacityChange(Number(event.target.value))}
              className="h-10 w-24 rounded-md border border-input bg-surface px-3 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-sm text-muted-text">lịch bắt đầu</span>
          </div>
          <span className="mt-2 block text-xs leading-5 text-muted-text">
            Mỗi giờ bắt đầu được tính riêng. Ví dụ, lịch lúc 09:00 không chiếm chỗ của khung 09:30.
          </span>
        </label>
      </div>

      <div className="mt-3 max-w-lg">
        <label className="block rounded-lg border border-border-subtle bg-slate-50 p-3 text-sm font-medium text-slate-700">
          Phí chăm giữ sau giờ đóng cửa (VNĐ)
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step={1}
              value={latePickupFeeAmount}
              disabled={readOnly}
              onChange={(event) => onLatePickupFeeAmountChange(Number(event.target.value))}
              className="h-10 w-36 rounded-md border border-input bg-surface px-3 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-sm text-muted-text">mỗi lịch hẹn</span>
          </div>
          <span className="mt-2 block text-xs leading-5 text-muted-text">
            Thu một lần nếu thú cưng vẫn chờ nhận lúc cơ sở đóng cửa. Nhập 0 để tắt khoản phí.
          </span>
        </label>
      </div>

      {invalidHours && (
        <p role="alert" className="mt-3 text-sm text-red-700">Giờ đóng cửa phải sau giờ mở cửa.</p>
      )}
      {saveError && (
        <p role="alert" className="mt-3 text-sm text-red-700">Không lưu được cấu hình: {saveError}</p>
      )}
      {savedMessage && <p role="status" className="mt-3 text-sm font-medium text-emerald-700">{savedMessage}</p>}

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-text">
          Thay đổi cấu hình không sửa hoặc hủy các lịch hẹn đã đặt.
        </p>
        <Button
          type="submit"
          disabled={!canSave || isSaving}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-admin-primary-hover"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Đang lưu…" : "Lưu cấu hình"}
        </Button>
      </div>
    </section>
  );
}
