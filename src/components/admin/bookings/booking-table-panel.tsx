"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableViewport } from "@/components/admin/admin-table-viewport";
import { BookingFilters, type BookingStatusFilter } from "@/components/admin/bookings/booking-filters";
import { BookingTableRow } from "@/components/admin/bookings/booking-table-row";
import type { BookingRecord } from "@/lib/admin-booking-record";

interface BookingTablePanelState {
  tableDateRange: { from: string; to: string } | null;
  searchQuery: string;
  statusFilter: BookingStatusFilter;
  total: number;
  filteredBookings: BookingRecord[];
  isLoading: boolean;
  hasError: boolean;
  page: number;
  totalPages: number;
  pageSize: number;
}

interface BookingTablePanelActions {
  onClearDate: () => void;
  onClearFilters: () => void;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (filter: BookingStatusFilter) => void;
  onRetry: () => unknown;
  onOpenDetail: (booking: BookingRecord) => void;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}

interface BookingTablePanelProps {
  state: BookingTablePanelState;
  actions: BookingTablePanelActions;
}

export function BookingTablePanel({ state, actions }: BookingTablePanelProps) {
  const {
    tableDateRange,
    searchQuery,
    statusFilter,
    total: bookingCount,
    filteredBookings,
    isLoading,
    hasError: bookingsError,
    page: bookingsPage,
    totalPages,
    pageSize: BOOKINGS_PAGE_SIZE,
  } = state;
  const { setPage: setBookingsPage, onClearDate } = actions;
  const hasBookingFilters = !!searchQuery.trim() || statusFilter !== "ALL" || tableDateRange !== null;

  return (
    <>
      {tableDateRange && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-admin-active-border bg-admin-primary-subtle px-3 py-2 text-xs text-admin-primary-hover">
          <span>Đang xem lịch ngày {new Date(`${tableDateRange.from}T00:00:00+07:00`).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "long", year: "numeric" })}</span>
          <Button type="button" variant="link" onClick={() => { onClearDate() }} className="h-auto p-0 font-semibold underline underline-offset-2">
            Bỏ lọc ngày
          </Button>
        </div>
      )}
      <BookingFilters
        searchQuery={searchQuery}
        onSearchQueryChange={actions.onSearchQueryChange}
        statusFilter={statusFilter}
        onStatusFilterChange={actions.onStatusFilterChange}
        total={bookingCount}
      />

      {/* KHỐI 4: BẢNG DỮ LIỆU CHÍNH (MASTER DATA TABLE) */}
      <Card className="w-full min-w-0 overflow-hidden rounded-xl border-border-subtle bg-surface shadow-xs">
        <CardContent className={isLoading || filteredBookings.length > 0 ? "p-0" : "p-4"}>
          {bookingsError ? (
            <AdminDataState
              variant="error"
              title="Không tải được lịch hẹn."
              description="Kiểm tra kết nối rồi thử lại."
              onRetry={actions.onRetry}
              className="min-h-44"
            />
          ) : !isLoading && filteredBookings.length === 0 ? (
            <AdminDataState
              variant="empty"
              title={hasBookingFilters ? "Không tìm thấy lịch hẹn phù hợp." : "Chưa có lịch hẹn nào."}
              description={hasBookingFilters ? "Thử thay đổi từ khóa, trạng thái hoặc ngày xem." : "Tạo lịch mới để ghi nhận cuộc hẹn hoặc khách đến trực tiếp."}
              action={hasBookingFilters ? (
                <Button type="button" variant="link" onClick={actions.onClearFilters} className="h-auto p-0 text-sm font-semibold text-primary">
                  Xóa bộ lọc
                </Button>
              ) : undefined}
              icon={<Calendar aria-hidden="true" className="size-8 text-slate-300" />}
              className="py-16"
            />
          ) : (
            <AdminTableViewport label="Danh sách lịch hẹn">
              <Table className="w-full min-w-[1050px]">
                <TableHeader className="border-b border-border-subtle bg-slate-100/80">
                  <TableRow className="border-border-subtle hover:bg-transparent">
                  <TableHead className="w-[120px] text-sm font-semibold text-slate-600">
                    Mã phiếu & giờ
                  </TableHead>
                  <TableHead className="w-[220px] text-sm font-semibold text-slate-600">
                    Thú cưng & lưu ý an toàn
                  </TableHead>
                  <TableHead className="min-w-[180px] text-sm font-semibold text-slate-600">
                    Dịch vụ & nhân viên phụ trách
                  </TableHead>
                  <TableHead className="w-[170px] text-sm font-semibold text-slate-600">
                    Khách hàng
                  </TableHead>
                  <TableHead className="w-[140px] text-sm font-semibold text-slate-600">
                    Thanh toán
                  </TableHead>
                  <TableHead className="w-[140px] text-sm font-semibold text-slate-600">
                    Trạng thái
                  </TableHead>
                  <TableHead className="w-[170px] pr-4 text-right text-sm font-semibold text-slate-600">
                    Thao tác
                  </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody aria-busy={isLoading}>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-3.5">
                          {i === 0 && <span className="sr-only" role="status" aria-live="polite">Đang tải danh sách lịch hẹn.</span>}
                          <Skeleton aria-hidden="true" className="mb-1.5 h-4 w-24" /><Skeleton aria-hidden="true" className="h-3 w-16" />
                        </TableCell>
                        <TableCell><Skeleton aria-hidden="true" className="mb-1.5 h-4 w-28" /><Skeleton aria-hidden="true" className="h-3 w-20" /></TableCell>
                        <TableCell><Skeleton aria-hidden="true" className="mb-1.5 h-4 w-24" /><Skeleton aria-hidden="true" className="h-3 w-16" /></TableCell>
                        <TableCell><Skeleton aria-hidden="true" className="mb-1.5 h-4 w-32" /><Skeleton aria-hidden="true" className="h-3 w-20" /></TableCell>
                        <TableCell><Skeleton aria-hidden="true" className="mb-1.5 h-4 w-20" /><Skeleton aria-hidden="true" className="h-3 w-14" /></TableCell>
                        <TableCell><Skeleton aria-hidden="true" className="h-2 w-full max-w-[120px]" /></TableCell>
                        <TableCell className="text-right"><Skeleton aria-hidden="true" className="ml-auto h-8 w-16 rounded-lg" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    filteredBookings.map((booking) => (
                      <BookingTableRow key={booking.id} booking={booking} onOpenDetail={actions.onOpenDetail} />
                    ))
                  )}
                </TableBody>
              </Table>
            </AdminTableViewport>
          )}
        </CardContent>
      </Card>
      {!bookingsError && !isLoading && bookingCount > 0 && (
        <AdminPagination
          from={(bookingsPage - 1) * BOOKINGS_PAGE_SIZE + 1}
          to={Math.min(bookingsPage * BOOKINGS_PAGE_SIZE, bookingCount)}
          total={bookingCount}
          itemLabel="lịch hẹn"
          page={bookingsPage}
          totalPages={totalPages}
          onPageChange={setBookingsPage}
        />
      )}
    </>
  );
}
