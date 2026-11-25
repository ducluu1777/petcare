import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type CalendarMode = "MONTH" | "WEEK" | "DAY";

const calendarModes: { value: CalendarMode; label: string }[] = [
  { value: "MONTH", label: "Tháng" },
  { value: "WEEK", label: "Tuần" },
  { value: "DAY", label: "Ngày" },
];

interface CalendarScheduleToolbarProps {
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  dateRangeLabel: string;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  hasClosedDates: boolean;
  showClosedDates: boolean;
  onShowClosedDatesChange: (show: boolean) => void;
  bookingDate: string;
  bookingDateLabel: string;
  isBookingDateClosed: boolean;
  onNewBooking: (date: string) => void;
}

export function CalendarScheduleToolbar({
  mode,
  onModeChange,
  onPrevious,
  onNext,
  onToday,
  dateRangeLabel,
  statusFilter,
  onStatusFilterChange,
  hasClosedDates,
  showClosedDates,
  onShowClosedDatesChange,
  bookingDate,
  bookingDateLabel,
  isBookingDateClosed,
  onNewBooking,
}: CalendarScheduleToolbarProps) {
  return (
    <div className="shrink-0 flex flex-col items-stretch justify-between gap-2 rounded-xl border border-border-subtle bg-surface p-2.5 shadow-xs xl:flex-row xl:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Chọn chế độ xem lịch" className="inline-flex items-center gap-0.5 rounded-lg border border-border-subtle bg-slate-100 p-1">
          {calendarModes.map(({ value, label }) => {
            const isActive = mode === value;
            return (
              <Button
                key={value}
                type="button"
                variant="ghost"
                aria-pressed={isActive}
                onClick={() => onModeChange(value)}
                className={`h-10 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-slate-600 hover:bg-surface hover:text-ink"
                }`}
              >
                {label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 border-l border-border-subtle pl-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={onPrevious}
            className="border-border-subtle bg-surface text-slate-700 hover:bg-slate-100"
            aria-label="Kỳ trước"
            title="Kỳ trước"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>

          <span className="min-w-[160px] whitespace-nowrap rounded-lg border border-border-subtle bg-slate-50 px-2.5 py-2 text-center text-sm font-semibold tabular-nums text-ink">
            {dateRangeLabel}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={onNext}
            className="border-border-subtle bg-surface text-slate-700 hover:bg-slate-100"
            aria-label="Kỳ sau"
            title="Kỳ sau"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onToday}
            className="border-border-subtle bg-surface px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Hôm nay
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
        <Select items={{ ALL: "Tất cả trạng thái", WAITING_CHECKIN: "Đã đặt", ARRIVED: "Đã tiếp nhận", IN_PROGRESS: "Đang chăm sóc", READY_FOR_PICKUP: "Chờ khách nhận", COMPLETED: "Hoàn tất", CANCELLED: "Đã hủy", NO_SHOW: "Không đến" }} value={statusFilter} onValueChange={(value) => { if (value) onStatusFilterChange(value); }}>
          <SelectTrigger aria-label="Lọc lịch theo trạng thái" className="h-10 rounded-lg border-border-subtle bg-slate-50 text-sm font-medium text-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="WAITING_CHECKIN">Đã đặt</SelectItem>
            <SelectItem value="ARRIVED">Đã tiếp nhận</SelectItem>
            <SelectItem value="IN_PROGRESS">Đang chăm sóc</SelectItem>
            <SelectItem value="READY_FOR_PICKUP">Chờ khách nhận</SelectItem>
            <SelectItem value="COMPLETED">Hoàn tất</SelectItem>
            <SelectItem value="CANCELLED">Đã hủy</SelectItem>
            <SelectItem value="NO_SHOW">Không đến</SelectItem>
          </SelectContent>
        </Select>

        {hasClosedDates && (
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border-subtle bg-slate-50 px-2.5 text-sm text-slate-600">
            <span className="font-medium">Hiển thị ngày cơ sở nghỉ</span>
            <Switch
              checked={showClosedDates}
              onCheckedChange={onShowClosedDatesChange}
              aria-label="Hiển thị ngày cơ sở nghỉ trên lịch"
            />
          </label>
        )}

        <Button
          type="button"
          size="lg"
          disabled={isBookingDateClosed}
          onClick={() => onNewBooking(bookingDate)}
          aria-label={isBookingDateClosed
            ? `Cơ sở nghỉ ngày ${bookingDateLabel}, không thể đặt lịch`
            : `Đặt lịch ngày ${bookingDateLabel}`}
          className="whitespace-nowrap text-sm font-semibold"
        >
          <Plus aria-hidden="true" className="size-4" />
          {mode === "MONTH" ? "Đặt lịch hôm nay" : `Đặt lịch ${bookingDateLabel.slice(0, 5)}`}
        </Button>
      </div>
    </div>
  );
}
