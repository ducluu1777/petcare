import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type DayHours = { open: string; close: string } | null;

interface WeekdayHoursRowProps {
  label: string;
  hours: DayHours;
  onToggle: (isOpen: boolean) => void;
  onOpenChange: (time: string) => void;
  onCloseChange: (time: string) => void;
  readOnly: boolean;
}

export function WeekdayHoursRow({
  label,
  hours,
  onToggle,
  onOpenChange,
  onCloseChange,
  readOnly,
}: WeekdayHoursRowProps) {
  const isOpen = hours !== null;

  return (
    <div className="grid gap-3 p-3 sm:grid-cols-[minmax(130px,1fr)_auto_minmax(180px,0.9fr)] sm:items-center">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <Switch
          checked={isOpen}
          disabled={readOnly}
          onCheckedChange={onToggle}
          aria-label={(isOpen ? "Đóng" : "Mở") + " cửa " + label.toLowerCase()}
        />
        <span className="text-xs text-muted-text">{isOpen ? "Mở cửa" : "Đóng cửa"}</span>
      </div>
      {isOpen ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm font-medium text-muted-text">
            Mở cửa <span aria-hidden="true">*</span>
            <Input
              type="time"
              required
              value={hours?.open ?? "08:30"}
              disabled={readOnly}
              onChange={(event) => onOpenChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-surface px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="text-sm font-medium text-muted-text">
            Đóng cửa <span aria-hidden="true">*</span>
            <Input
              type="time"
              required
              value={hours?.close ?? "18:30"}
              disabled={readOnly}
              onChange={(event) => onCloseChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-surface px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
      ) : (
        <span className="text-xs text-muted-text sm:text-right">Không nhận lịch trong ngày</span>
      )}
    </div>
  );
}
