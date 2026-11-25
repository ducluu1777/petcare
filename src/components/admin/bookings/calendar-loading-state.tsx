import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarMode } from "@/components/admin/bookings/calendar-schedule-toolbar";

export function CalendarLoadingState({ mode }: { mode: CalendarMode }) {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải lịch hẹn"
      className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border-subtle bg-surface"
    >
      <span className="sr-only" role="status" aria-live="polite">Đang tải lịch hẹn.</span>
      {mode === "MONTH" ? (
        <div className="grid h-full min-h-[360px] grid-cols-7 grid-rows-5 divide-x divide-y divide-border-subtle">
          {Array.from({ length: 35 }, (_, index) => (
            <div key={index} aria-hidden="true" className="min-h-0 bg-surface p-1.5 sm:p-2">
              <Skeleton className="h-3 w-5" />
              {index % 3 === 0 && <Skeleton className="mt-2 h-3 w-full max-w-16" />}
              {index % 5 === 0 && <Skeleton className="mt-1.5 h-3 w-3/4" />}
            </div>
          ))}
        </div>
      ) : mode === "WEEK" ? (
        <div className="h-full min-h-[360px] overflow-x-auto">
          <div aria-hidden="true" className="grid h-full min-w-[840px] grid-cols-7 divide-x divide-border-subtle">
            {Array.from({ length: 7 }, (_, dayIndex) => (
              <div key={dayIndex} className="space-y-3 p-2">
                <Skeleton className="mx-auto h-4 w-20" />
                {Array.from({ length: dayIndex % 2 === 0 ? 3 : 2 }, (_, bookingIndex) => (
                  <div key={bookingIndex} className="space-y-2 rounded-lg border border-border-subtle p-2">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div aria-hidden="true" className="grid h-full min-h-[360px] grid-cols-1 divide-y divide-border-subtle md:grid-cols-3 md:divide-x md:divide-y-0">
          {Array.from({ length: 3 }, (_, columnIndex) => (
            <div key={columnIndex} className="min-h-48 space-y-3 p-3">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 2 }, (_, bookingIndex) => (
                <div key={bookingIndex} className="space-y-2 rounded-lg border border-border-subtle p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
