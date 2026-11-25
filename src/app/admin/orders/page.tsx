"use client";

import { ShoppingBag, Clock, PackageCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminTableSkeleton } from "@/components/admin/admin-table-skeleton";
import { AdminTableViewport } from "@/components/admin/admin-table-viewport";
import { OrderTableRow } from "@/components/admin/orders/order-table-row";
import { OrderDetailDialog } from "@/components/admin/orders/order-detail-dialog";
import { OrderListFilters } from "@/components/admin/orders/order-list-filters";
import { SepayReviewList } from "@/components/admin/orders/sepay-review-list";
import { formatAdminOrderAmount } from "@/lib/admin-order-record";
import { useAdminOrdersWorkflow } from "@/hooks/use-admin-orders-workflow";

export default function AdminOrdersPage() {
  const workflow = useAdminOrdersWorkflow();

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Bán hàng"
        subsection="Đơn hàng"
        title="Quản lý đơn hàng"
        description="Theo dõi đơn nhận tại cửa hàng, đơn giao bởi PetCare và thanh toán QR."
        onRefresh={workflow.refreshOrders}
        isRefreshing={workflow.isRefreshing}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard
          label="Tổng số đơn"
          value={workflow.isSummaryLoading || workflow.isSummaryError ? "—" : `${workflow.summary?.total ?? 0} đơn`}
          icon={<ShoppingBag className="size-5" />}
          tone="primary"
        />
        <AdminMetricCard
          label="Chưa thanh toán"
          value={workflow.isSummaryLoading || workflow.isSummaryError ? "—" : `${workflow.summary?.unpaid ?? 0} đơn`}
          icon={<Clock className="size-5" />}
          tone="warning"
        />
        <AdminMetricCard
          label="Quá hạn 24 giờ"
          value={workflow.isSummaryLoading || workflow.isSummaryError ? "—" : `${workflow.summary?.overdue ?? 0} đơn`}
          icon={<Clock className="size-5" />}
          tone="warning"
        />
        <AdminMetricCard
          label="Đơn đã hoàn tất"
          value={workflow.isSummaryLoading || workflow.isSummaryError ? "—" : `${workflow.summary?.completed ?? 0} đơn`}
          icon={<PackageCheck className="size-5" />}
          tone="primary"
        />
        <AdminMetricCard
          label="Doanh thu đã thu"
          value={workflow.isSummaryLoading || workflow.isSummaryError
            ? "—"
            : formatAdminOrderAmount(workflow.summary?.paidRevenue ?? 0)}
          icon={<CreditCard className="size-5" />}
          tone="success"
        />
      </div>

      <SepayReviewList />

      <OrderListFilters
        searchQuery={workflow.searchQuery}
        selectedStatus={workflow.selectedStatus}
        onSearchChange={workflow.onSearchChange}
        onStatusChange={workflow.onStatusChange}
      />

      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xs">
        {workflow.isError ? (
          <AdminDataState variant="error" title="Không tải được đơn hàng." onRetry={workflow.refetch} />
        ) : !workflow.isLoading && workflow.orders.length === 0 ? (
          <AdminDataState
            variant="empty"
            title={workflow.hasOrderFilters ? "Không tìm thấy đơn hàng phù hợp." : "Chưa có đơn hàng nào."}
            description={workflow.hasOrderFilters
              ? "Thử thay đổi từ khóa hoặc trạng thái đơn hàng."
              : "Đơn online và bán tại quầy sẽ hiển thị tại đây."}
            action={workflow.hasOrderFilters ? (
              <Button
                type="button"
                variant="link"
                onClick={workflow.clearFilters}
                className="h-auto p-0 text-sm font-semibold text-admin-primary"
              >
                Xóa bộ lọc
              </Button>
            ) : undefined}
          />
        ) : (
          <AdminTableViewport label="Danh sách đơn hàng">
            <Table className="w-full min-w-[1000px] text-left text-sm">
              <TableHeader className="border-b border-border-subtle bg-admin-muted-surface font-bold text-muted-text">
                <TableRow>
                  <TableHead className="px-4 py-3">Mã đơn</TableHead>
                  <TableHead className="px-4 py-3">Khách hàng &amp; thông tin nhận</TableHead>
                  <TableHead className="px-4 py-3">Sản phẩm</TableHead>
                  <TableHead className="px-4 py-3">Tổng tiền</TableHead>
                  <TableHead className="px-4 py-3">Thanh toán</TableHead>
                  <TableHead className="px-4 py-3">Trạng thái</TableHead>
                  <TableHead className="px-4 py-3 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border-subtle" aria-busy={workflow.isLoading}>
                {workflow.isLoading ? (
                  <AdminTableSkeleton columns={7} label="đơn hàng" />
                ) : (
                  workflow.orders.map((order) => (
                    <OrderTableRow
                      key={order.id}
                      order={order}
                      isUpdating={workflow.isUpdatingStatus}
                      onView={() => workflow.setSelectedOrder(order)}
                      onAdvance={(status, label) => workflow.handleUpdateStatus(order.id, status, label)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </AdminTableViewport>
        )}
      </div>

      {!workflow.isLoading && !workflow.isError && workflow.orders.length > 0 && (
        <AdminPagination
          from={workflow.firstOrder}
          to={workflow.lastOrder}
          total={workflow.totalOrders}
          itemLabel="đơn hàng"
          page={workflow.page}
          totalPages={workflow.totalPages}
          onPageChange={workflow.setPage}
        />
      )}

      <OrderDetailDialog
        key={workflow.selectedOrder?.id ?? "closed"}
        order={workflow.selectedOrder}
        isUpdating={workflow.isUpdating}
        onClose={() => workflow.setSelectedOrder(null)}
        onUpdateStatus={workflow.handleUpdateStatus}
        onCancelOrder={workflow.handleCancelOnlineOrder}
        onRecordRefund={workflow.handleRecordOnlineOrderRefund}
        onConfirmTransfer={workflow.handleConfirmOnlineOrderTransfer}
      />
    </AdminPageShell>
  );
}
