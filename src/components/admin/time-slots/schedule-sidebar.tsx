"use client";

import { CalendarDays, Plus, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { vietnamDateKey } from "@/lib/calendar-date-utils";
import type { ShopScheduleSettings } from "@/hooks/use-time-slots";

const SHOP_TIME_ZONE = "Asia/Ho_Chi_Minh";

interface ScheduleSidebarProps {
  draft: ShopScheduleSettings;
  isDirty: boolean;
  readOnly: boolean;
  openDays: number;
  holidayDraft: string;
  onHolidayDraftChange: (value: string) => void;
  onAddHoliday: () => void;
  onRemoveHoliday: (date: string) => void;
}

function formatDate(date: string) {
  return new Date(date + "T12:00:00+07:00").toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SHOP_TIME_ZONE,
  });
}

export function ScheduleSidebar({
  draft,
  isDirty,
  readOnly,
  openDays,
  holidayDraft,
  onHolidayDraftChange,
  onAddHoliday,
  onRemoveHoliday,
}: ScheduleSidebarProps) {
  return (
    <aside className="space-y-5">
      <section className="rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-lg bg-sky-50 p-2 text-sky-700"><Store aria-hidden="true" className="h-5 w-5" /></span>
          <div>
            <h2 className="font-semibold text-ink">Tóm tắt vận hành</h2>
            <p className="text-xs text-muted-text">
              {isDirty ? "Theo cấu hình đang chỉnh sửa." : "Theo cấu hình đã lưu."}
            </p>
          </div>
        </div>
        <dl className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
          <div className="flex items-center justify-between gap-3 p-3 text-sm">
            <dt className="text-muted-text">Ngày mở cửa mỗi tuần</dt>
            <dd className="font-semibold tabular-nums text-ink">{openDays} / 7</dd>
          </div>
          <div className="flex items-center justify-between gap-3 p-3 text-sm">
            <dt className="text-muted-text">Công suất tối đa</dt>
            <dd className="font-semibold tabular-nums text-ink">{draft.capacity} lịch / khung 30 phút</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-lg bg-amber-50 p-2 text-amber-700"><CalendarDays aria-hidden="true" className="h-5 w-5" /></span>
          <div>
            <h2 className="font-semibold text-ink">Ngày nghỉ riêng</h2>
            <p className="text-xs text-muted-text">Ngày nghỉ sẽ không có giờ bắt đầu còn trống.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            min={vietnamDateKey()}
            value={holidayDraft}
            disabled={readOnly}
            onChange={(event) => onHolidayDraftChange(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Chọn ngày nghỉ"
          />
          <Button
            type="button"
            onClick={onAddHoliday}
            disabled={readOnly || !holidayDraft || draft.holidays.includes(holidayDraft)}
            variant="outline"
            className="h-10 rounded-lg border-border-subtle px-3 text-sm font-semibold text-ink hover:bg-slate-50"
          >
            <Plus aria-hidden="true" className="h-4 w-4" /> Thêm
          </Button>
        </div>
        {draft.holidays.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-5 text-center text-xs text-muted-text">Chưa có ngày nghỉ riêng.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle">
            {draft.holidays.map((date) => (
              <li key={date} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm capitalize text-ink">{formatDate(date)}</span>
                <Button
                  type="button"
                  onClick={() => onRemoveHoliday(date)}
                  disabled={readOnly}
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-md text-muted-text hover:bg-red-50 hover:text-red-700"
                  aria-label={"Xóa ngày nghỉ " + formatDate(date)}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
