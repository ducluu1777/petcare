import { Check, CheckCircle2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingRecord } from "@/lib/admin-booking-record";

const MILESTONES: Array<{
  key: string;
  label: string;
  hint: string;
}> = [
  { key: "arrived", label: "Đã tiếp nhận", hint: "Xác nhận thú cưng đã có mặt" },
  { key: "service", label: "Đang chăm sóc", hint: "Bắt đầu thực hiện dịch vụ" },
  { key: "ready", label: "Chờ khách nhận", hint: "Báo khách đến nhận thú cưng" },
  { key: "done", label: "Hoàn tất", hint: "Đã thanh toán và bàn giao thú cưng" },
];

const MILESTONE_INDEX: Record<BookingRecord["status"], number> = {
  WAITING_CHECKIN: 0,
  ARRIVED: 1,
  IN_PROGRESS: 2,
  READY_FOR_PICKUP: 3,
  COMPLETED: 4,
  CANCELLED: -1,
  NO_SHOW: -1,
};

const LEGACY_MILESTONE_INDEX: Record<BookingRecord["status"], number> = {
  WAITING_CHECKIN: 0,
  ARRIVED: -1,
  IN_PROGRESS: 1,
  READY_FOR_PICKUP: 2,
  COMPLETED: 3,
  CANCELLED: -1,
  NO_SHOW: -1,
};

type BookingProgressAction = {
  target: "ARRIVED" | "IN_PROGRESS" | "READY_FOR_PICKUP";
  label: string;
};

interface BookingProgressCardProps {
  booking: BookingRecord;
  nextAction: BookingProgressAction | null;
  isUpdating: boolean;
  canMarkNoShow: boolean;
  noShowEligibleAt: number | null;
  onAdvance: (status: BookingProgressAction["target"]) => void;
  onOpenNoShow: () => void;
}

export function BookingProgressCard({
  booking,
  nextAction,
  isUpdating,
  canMarkNoShow,
  noShowEligibleAt,
  onAdvance,
  onOpenNoShow,
}: BookingProgressCardProps) {
  const isClosed = ["CANCELLED", "NO_SHOW", "COMPLETED"].includes(booking.status);

  return (
    <section aria-labelledby="booking-progress-title" className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="booking-progress-title" className="text-sm font-semibold text-ink">Tình trạng lịch</h3>
        <span className="text-xs text-muted-text">Cập nhật khi tiếp nhận thú cưng và khi dịch vụ hoàn tất.</span>
      </div>

      {isClosed ? (
        <div className={`flex items-center gap-2.5 rounded-lg border p-3 text-xs font-semibold ${booking.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : booking.status === "NO_SHOW" ? "border-orange-200 bg-orange-50 text-orange-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {booking.status === "COMPLETED" ? <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" /> : booking.status === "NO_SHOW" ? <Clock aria-hidden="true" className="size-4 shrink-0" /> : <X aria-hidden="true" className="size-4 shrink-0" />}
          <div>
            <span className="block font-bold">{booking.status === "COMPLETED" ? "Hoàn tất và đã bàn giao" : booking.status === "NO_SHOW" ? "Không đến" : "Lịch đã hủy"}</span>
            <span className="text-xs font-normal">Lịch hẹn vẫn nằm trong danh sách để bạn xem lại khi cần.</span>
          </div>
        </div>
      ) : (
        <>
          <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {(booking.statusV2 ? MILESTONES : MILESTONES.filter((step) => step.key !== "arrived")).map((step, index) => {
              const activeIndex = booking.statusV2
                ? MILESTONE_INDEX[booking.status]
                : LEGACY_MILESTONE_INDEX[booking.status];
              const isDone = index < activeIndex;
              const isCurrent = index === activeIndex;

              return (
                <li key={step.key} className={`rounded-lg border p-2.5 ${isDone ? "border-emerald-200 bg-emerald-50" : isCurrent ? "border-teal-300 bg-teal-50" : "border-border-subtle bg-slate-50"}`}>
                  <div className="flex items-center gap-1.5">
                    {isDone ? (
                      <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${isCurrent ? "border-primary text-primary" : "border-slate-300 text-slate-400"}`}>
                        {index + 1}
                      </span>
                    )}
                    <span className={`text-xs font-bold ${isDone ? "text-emerald-800" : isCurrent ? "text-primary" : "text-slate-600"}`}>{step.label}</span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-muted-text">{step.hint}</p>
                </li>
              );
            })}
          </ol>

          {nextAction ? (
            <Button
              type="button"
              onClick={() => onAdvance(nextAction.target)}
              disabled={isUpdating}
              className="h-10 gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              <Check aria-hidden="true" className="size-4" />
              {nextAction.label}
            </Button>
          ) : booking.status === "READY_FOR_PICKUP" ? (
            <p className="text-xs text-muted-text">Mở phần thanh toán bên dưới để ghi nhận tiền và bàn giao.</p>
          ) : null}

          {booking.statusV2 === "BOOKED" && booking.startAt && noShowEligibleAt !== null && (
            <div className="flex flex-col items-start gap-2 border-t border-border-subtle pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-text">
                Có thể ghi nhận “Không đến” từ {new Date(noShowEligibleAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={!canMarkNoShow || isUpdating}
                onClick={onOpenNoShow}
                className="h-10 border-slate-300 text-slate-700"
              >
                <Clock aria-hidden="true" className="size-4" />
                Đánh dấu không đến
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
