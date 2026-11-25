"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CalendarScheduleView } from "@/components/admin/bookings/calendar-schedule-view"
import type { BookingStatusFilter } from "@/components/admin/bookings/booking-filters"
import { BookingTablePanel } from "@/components/admin/bookings/booking-table-panel"
import { BookingCreateDialog } from "@/components/admin/bookings/booking-create-dialog"
import { BookingDetailSheet } from "@/components/admin/bookings/booking-detail-sheet"
import { BookingViewSwitcher } from "@/components/admin/bookings/booking-view-switcher"
import { BookingNoShowDialog } from "@/components/admin/bookings/booking-no-show-dialog"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminPageShell } from "@/components/admin/admin-page-shell"
import type { BookingRecord } from "@/lib/admin-booking-record"
import { CalendarPlus, Plus } from "lucide-react"
import { useBookingDetailWorkflow } from "@/hooks/use-booking-detail-workflow"
import { useShopScheduleSettings } from "@/hooks/use-time-slots"
import { useAdminBookingDirectory } from "@/hooks/use-admin-booking-directory"
import { useBookingCreateWorkflow } from "@/hooks/use-booking-create-workflow"
import { useBookingCashierWorkflow } from "@/hooks/use-booking-cashier-workflow"
import { useBookingStatusWorkflow } from "@/hooks/use-booking-status-workflow"
const BOOKINGS_PAGE_SIZE = 20;

function BookingsManagementContent() {
  const scheduleSettingsQuery = useShopScheduleSettings()
  const searchParams = useSearchParams()
  const {
    bookings,
    bookingsMeta,
    bookingsPage,
    bookingsError,
    calendarRange,
    handleCalendarRangeChange,
    handleViewLayoutChange,
    isFetching,
    isLoading,
    refetch,
    searchQuery,
    setBookings,
    setBookingsPage,
    setSearchQuery,
    setStatusFilter,
    setTableDateRange,
    setViewLayout,
    statusFilter,
    tableDateRange,
    viewLayout,
  } = useAdminBookingDirectory({ searchParams, pageSize: BOOKINGS_PAGE_SIZE })
  const [selectedBooking, setSelectedBooking] = React.useState<BookingRecord | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)

  const showToast = React.useCallback((text: string, type: "success" | "error" | "info" = "success") => {
    if (type === "error") toast.error(text)
    else if (type === "info") toast(text)
    else toast.success(text)
  }, [])

  const bookingCreateWorkflow = useBookingCreateWorkflow({ onCreated: refetch, showToast });
  const bookingCashierWorkflow = useBookingCashierWorkflow({
    selectedBooking,
    setSelectedBooking,
    setBookings,
    isSheetOpen,
    refetch,
    showToast,
  });
  const bookingStatusWorkflow = useBookingStatusWorkflow({
    bookings,
    selectedBooking,
    setSelectedBooking,
    setBookings,
    refetch,
    showToast,
    updateStatusMutation: bookingCashierWorkflow.updateStatusMutation,
    updateStatusV2Mutation: bookingCashierWorkflow.updateStatusV2Mutation,
  });
  const {
    cashierVoucherCode,
    cashierVoucherDiscount,
    isPaidSuccess,
    effectiveRemaining,
    cashierCardState,
    cashierCardActions,
  } = bookingCashierWorkflow;

  const bookingDetailWorkflow = useBookingDetailWorkflow({
    selectedBooking,
    setSelectedBooking,
    setSheetOpen: setIsSheetOpen,
    setBookings,
    refetch,
    resetCashierForBooking: bookingCashierWorkflow.resetForBooking,
    showToast,
    onWeightSavedAndStart: (booking) => bookingStatusWorkflow.handleUpdateStatus(
      booking.id,
      "IN_PROGRESS",
      undefined,
      booking,
      "Đã bắt đầu chăm sóc.",
    ),
  });

  const openedFromDashboard = React.useRef<string | null>(null)
  React.useEffect(() => {
    const code = searchParams.get("open")
    if (!code || openedFromDashboard.current === code) return
    const booking = bookings.find((item) => item.code === code)
    if (!booking) return
    openedFromDashboard.current = code
    bookingDetailWorkflow.open(booking)
  }, [bookings, searchParams, bookingDetailWorkflow])

  const handlePrintBooking = (booking: BookingRecord) => {
    showToast(`Đang chuẩn bị bản in phiếu dịch vụ #${booking.code} cho thú cưng ${booking.pet.name}...`, "info")
    window.setTimeout(() => window.print(), 350)
  }

  const handleOpenCustomerZalo = (booking: BookingRecord) => {
    const phone = booking.customer.phone.replace(/[^0-9]/g, "")
    if (!phone) {
      showToast("Khách hàng chưa có số điện thoại liên kết", "error")
      return
    }
    showToast(`Đang mở Zalo với khách hàng ${booking.customer.name}...`, "info")
    window.open(`https://zalo.me/${phone}`, "_blank", "noopener,noreferrer")
  }

  const bookingTableState = {
    tableDateRange,
    searchQuery,
    statusFilter,
    total: bookingsMeta.total,
    filteredBookings: bookings,
    isLoading,
    hasError: bookingsError,
    page: bookingsPage,
    totalPages: bookingsMeta.totalPages,
    pageSize: BOOKINGS_PAGE_SIZE,
  }
  const bookingTableActions = {
    onClearDate: () => {
      setTableDateRange(null)
      setBookingsPage(1)
    },
    onClearFilters: () => {
      setTableDateRange(null)
      setSearchQuery("")
      setStatusFilter("ALL")
      setBookingsPage(1)
    },
    onSearchQueryChange: (value: string) => {
      setSearchQuery(value)
      setBookingsPage(1)
    },
    onStatusFilterChange: (filter: BookingStatusFilter) => {
      setStatusFilter(filter)
      setBookingsPage(1)
    },
    onRetry: refetch,
    onOpenDetail: bookingDetailWorkflow.open,
    setPage: setBookingsPage,
  }

  return (
    <AdminPageShell className={
      viewLayout === "CALENDAR"
        ? "min-w-0 space-y-2.5"
        : "min-w-0"
    }>
      
      <AdminPageHeader
        density={viewLayout === "CALENDAR" ? "compact" : "default"}
        section="Vận hành Spa"
        title="Lịch hẹn"
        description="Theo dõi lịch, xác nhận đã tiếp nhận thú cưng và cập nhật tình trạng phục vụ."
        onRefresh={refetch}
        isRefreshing={isFetching}
        actions={(
          <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2.5 2xl:w-auto 2xl:justify-end">
            <BookingViewSwitcher value={viewLayout} onChange={handleViewLayoutChange} />
            {viewLayout === "TABLE" && (
              <Button
                type="button"
                onClick={() => bookingCreateWorkflow.openAppointmentDialog()}
                variant="outline"
                className="h-10 rounded-lg border-border-subtle bg-surface px-3.5 text-sm font-bold text-primary hover:bg-slate-50"
              >
                <CalendarPlus aria-hidden="true" className="size-3.5" />
                Đặt lịch hẹn
              </Button>
            )}
            <Button
              type="button"
              onClick={bookingCreateWorkflow.openWalkInDialog}
              className="h-10 rounded-lg bg-primary px-3.5 text-sm font-bold text-surface hover:brightness-110"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Tiếp nhận tại quầy
            </Button>
          </div>
        )}
      />

      {viewLayout === "CALENDAR" ? (
        <>
          {bookingsMeta.total > bookings.length && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span>Trong khoảng này có {bookingsMeta.total} lịch; lịch xem đang hiển thị 100 lịch đầu.</span>
              <Button type="button" variant="link" onClick={() => setViewLayout("TABLE")} className="h-auto shrink-0 p-0 font-semibold underline underline-offset-2">Mở danh sách</Button>
            </div>
          )}
          <CalendarScheduleView
            bookings={bookings}
            closedDates={scheduleSettingsQuery.data?.holidays ?? []}
            isLoading={calendarRange === null || isLoading || (bookingsError && isFetching)}
            hasError={bookingsError}
            onOpenDetail={bookingDetailWorkflow.open}
            onNewBooking={bookingCreateWorkflow.openAppointmentDialog}
            onRetry={refetch}
            onVisibleRangeChange={handleCalendarRangeChange}
          />
        </>
      ) : (
        <BookingTablePanel state={bookingTableState} actions={bookingTableActions} />
      )}

      <BookingDetailSheet
        state={{
          open: isSheetOpen,
          booking: selectedBooking,
          ...bookingDetailWorkflow.state,
          nextBookingAction: bookingStatusWorkflow.nextBookingAction,
          isUpdatingStatus: bookingStatusWorkflow.isUpdatingStatus || bookingDetailWorkflow.state.isSavingWeight,
          canMarkNoShow: bookingStatusWorkflow.canMarkNoShow,
          noShowEligibleAt: bookingStatusWorkflow.noShowEligibleAt,
          cashierVoucherCode,
          cashierVoucherDiscount,
          isPaidSuccess,
          effectiveRemaining,
          cashierCardState,
          cashierCardActions,
        }}
        actions={{
          ...bookingDetailWorkflow.actions,
          onOpenChange: setIsSheetOpen,
          onPrint: handlePrintBooking,
          onOpenChat: handleOpenCustomerZalo,
          onAdvance: (status) => {
            if (!selectedBooking) return;
            if (status === "IN_PROGRESS" && selectedBooking.statusV2 === "ARRIVED") {
              void bookingDetailWorkflow.actions.onStartService();
              return;
            }
            void bookingStatusWorkflow.handleUpdateStatus(selectedBooking.id, status);
          },
          onOpenNoShow: bookingStatusWorkflow.openNoShowDialog,
        }}
      />

      <BookingCreateDialog {...bookingCreateWorkflow.dialogProps} />

      <BookingNoShowDialog
        open={bookingStatusWorkflow.isNoShowDialogOpen}
        reason={bookingStatusWorkflow.noShowReason}
        isSubmitting={bookingStatusWorkflow.isUpdatingStatus}
        onOpenChange={bookingStatusWorkflow.handleNoShowDialogOpenChange}
        onReasonChange={bookingStatusWorkflow.setNoShowReason}
        onConfirm={() => void bookingStatusWorkflow.handleMarkNoShow()}
      />

    </AdminPageShell>
  )
}

function BookingsRouteState() {
  const searchParams = useSearchParams();
  return <BookingsManagementContent key={searchParams.toString()} />;
}

export default function BookingsManagementPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-text">Đang tải lịch hẹn...</div>}>
      <BookingsRouteState />
    </React.Suspense>
  )
}
