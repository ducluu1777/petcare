"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { ScheduleSidebar } from "@/components/admin/time-slots/schedule-sidebar";
import { ScheduleHoursEditor } from "@/components/admin/time-slots/schedule-hours-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminScheduleWorkflow } from "@/hooks/use-admin-schedule-workflow";

export default function AdminTimeSlotsPage() {
  const workflow = useAdminScheduleWorkflow();
  const { draft } = workflow;

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Vận hành"
        subsection="Spa"
        title="Giờ hoạt động và ngày nghỉ"
        description="Giờ Spa mặc định là 08:30–18:30. Không nhận giờ bắt đầu mới trong 14:00–15:00; mỗi khung 30 phút có giới hạn công suất riêng."
        onRefresh={workflow.refresh}
        isRefreshing={workflow.isFetching}
        refreshDisabled={workflow.refreshDisabled}
        actions={workflow.isDirty ? (
          <span role="status" className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            Có thay đổi chưa lưu
          </span>
        ) : null}
      />

      {!workflow.canManageSchedule && (
        <p role="note" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Nhân viên được xem lịch hoạt động và ngày nghỉ; chỉ quản trị viên được chỉnh cấu hình.
        </p>
      )}

      {workflow.isLoading ? (
        <section
          className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]"
          aria-label="Đang tải cấu hình"
          aria-busy="true"
        >
          <div className="space-y-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
            </div>
            <div className="space-y-2">
              {workflow.weekdays.map(({ key }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-9 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-9 w-44 max-w-[45%]" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-48 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </section>
      ) : workflow.isError ? (
        <AdminDataState
          variant="error"
          title="Không tải được cấu hình giờ hoạt động và ngày nghỉ."
          description={workflow.loadErrorMessage}
          onRetry={workflow.refresh}
          className="rounded-xl border border-red-200 bg-red-50"
        />
      ) : draft ? (
        <form
          onSubmit={workflow.handleSave}
          className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]"
        >
          <ScheduleHoursEditor
            weekdays={workflow.weekdays}
            openHours={draft.openHours}
            capacity={draft.capacity}
            latePickupFeeAmount={draft.latePickupFeeAmount}
            hasDefaultSpaHours={workflow.hasDefaultSpaHours}
            isSaving={workflow.isSaving}
            canSave={workflow.canSave}
            readOnly={!workflow.canManageSchedule}
            invalidHours={workflow.invalidHours}
            savedMessage={workflow.savedMessage}
            saveError={workflow.saveErrorMessage}
            onApplyDefaultSpaHours={workflow.applyDefaultSpaHours}
            onToggleDay={workflow.onToggleDay}
            onOpenChange={workflow.onOpenChange}
            onCloseChange={workflow.onCloseChange}
            onCapacityChange={workflow.onCapacityChange}
            onLatePickupFeeAmountChange={workflow.onLatePickupFeeAmountChange}
          />

          <ScheduleSidebar
            draft={draft}
            isDirty={workflow.isDirty}
            readOnly={!workflow.canManageSchedule}
            openDays={workflow.openDays}
            holidayDraft={workflow.holidayDraft}
            onHolidayDraftChange={workflow.setHolidayDraft}
            onAddHoliday={workflow.handleAddHoliday}
            onRemoveHoliday={workflow.handleRemoveHoliday}
          />
        </form>
      ) : null}
    </AdminPageShell>
  );
}
