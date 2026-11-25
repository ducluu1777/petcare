import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BookingAppointmentFieldsProps {
  date: Date;
  times: string[];
  selectedTime: string;
  requestedTime: string;
  hasManuallySelectedTime: boolean;
  isAvailabilityReady: boolean;
  isLoading: boolean;
  isError: boolean;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
}

export function BookingAppointmentFields({
  date,
  times,
  selectedTime,
  requestedTime,
  hasManuallySelectedTime,
  isAvailabilityReady,
  isLoading,
  isError,
  onDateChange,
  onTimeChange,
}: BookingAppointmentFieldsProps) {
  const requestedTimeUnavailable =
    hasManuallySelectedTime &&
    Boolean(requestedTime) &&
    !times.includes(requestedTime) &&
    !isLoading &&
    !isError;

  return (
    <section aria-labelledby="booking-appointment-fields-title" className="space-y-3 rounded-xl border border-border-subtle bg-slate-50 p-3.5">
      <h3 id="booking-appointment-fields-title" className="text-sm font-semibold text-slate-700">Ngày và giờ hẹn</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="appointment-date" className="mb-1 block text-sm font-semibold text-slate-700">Ngày hẹn <span aria-hidden="true">*</span></Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  id="appointment-date"
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-start gap-2 rounded-lg border-border-subtle bg-surface px-3 text-sm font-medium text-ink hover:bg-slate-50"
                >
                  <CalendarIcon aria-hidden="true" className="size-3.5 text-muted-text" />
                  {format(date, "dd/MM/yyyy")}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(nextDate) => nextDate && onDateChange(nextDate)}
                locale={vi}
                disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="appointment-time" className="mb-1 block text-sm font-semibold text-slate-700">Giờ hẹn <span aria-hidden="true">*</span></Label>
          <Select items={times.map((time) => ({ value: time, label: time }))} value={selectedTime || null} onValueChange={(value) => onTimeChange(value || "")}>
            <SelectTrigger id="appointment-time" className="w-full bg-surface text-sm" disabled={isLoading || times.length === 0}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {times.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}
            </SelectContent>
          </Select>
          {requestedTimeUnavailable && selectedTime && (
            <p role="status" className="mt-1 rounded-lg bg-amber-50 px-2 py-1.5 text-xs leading-relaxed text-amber-900">
              Khung {requestedTime} không còn chỗ với thông tin hiện tại. Đã chuyển sang khung còn chỗ kế tiếp: {selectedTime}. Vui lòng kiểm tra giờ trước khi đặt.
            </p>
          )}
          {requestedTimeUnavailable && !selectedTime && (
            <p role="status" className="mt-1 rounded-lg bg-amber-50 px-2 py-1.5 text-xs leading-relaxed text-amber-900">
              Khung {requestedTime} không còn chỗ và không còn khung muộn hơn trong ngày. Chọn ngày khác hoặc chọn một giờ còn chỗ.
            </p>
          )}
          {isLoading && <p className="mt-1 text-xs text-muted-text">Đang tìm giờ còn chỗ…</p>}
          {isError && <p role="alert" className="mt-1 text-xs text-rose-700">Không tải được giờ còn chỗ. Vui lòng thử lại.</p>}
          {!isAvailabilityReady && !isLoading && !isError && (
            <p className="mt-1 text-xs text-muted-text">
              Chọn khách hàng, thú cưng và dịch vụ để xem giờ còn chỗ.
            </p>
          )}
          {isAvailabilityReady && !isLoading && !isError && times.length === 0 && (
            <p className="mt-1 text-xs text-muted-text">
              Không có giờ phù hợp. Ngày có thể đã nghỉ, hết giờ hoạt động, kín công suất hoặc thú cưng chưa phù hợp cân nặng. Kiểm tra dịch vụ và cân nặng hoặc chọn ngày khác.
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-text">Không nhận giờ bắt đầu mới từ 14:00 đến trước 15:00 để bàn giao ca. Lịch đã bắt đầu trước 14:00 vẫn tiếp tục bình thường.</p>
    </section>
  );
}
