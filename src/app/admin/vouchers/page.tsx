"use client";

import { CheckCircle2, Gift, Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { SpaBookingPromotionPanel } from "@/components/admin/vouchers/spa-booking-promotion-panel";
import { VoucherCard } from "@/components/admin/vouchers/voucher-card";
import { VoucherEditDialog } from "@/components/admin/vouchers/voucher-edit-dialog";
import { VoucherFormDialog } from "@/components/admin/vouchers/voucher-form-dialog";
import { VoucherListFilters } from "@/components/admin/vouchers/voucher-list-filters";
import { useAdminVouchersWorkflow } from "@/hooks/use-admin-vouchers-workflow";

export default function AdminVouchersPage() {
  const {
    firstVoucher,
    filteredVouchers,
    handleSearchChange,
    handleToggleVoucherActive,
    isError,
    isFetching,
    isLoading,
    lastVoucher,
    openVoucherCreateDialog,
    page,
    promotionPanelProps,
    refetch,
    searchQuery,
    setPage,
    setVoucherBeingEdited,
    stats,
    totalPages,
    visibleVouchers,
    voucherEditKey,
    voucherEditProps,
    voucherFormActions,
    voucherFormState,
    voucherList,
  } = useAdminVouchersWorkflow();

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Khuyến mãi"
        subsection="Ưu đãi và điểm tích lũy"
        title="Voucher và ưu đãi"
        description="Tạo voucher dùng mã hoặc đổi bằng điểm; theo dõi hạn dùng và lượt sử dụng."
        onRefresh={refetch}
        isRefreshing={isFetching}
        actions={(
          <Button type="button" onClick={openVoucherCreateDialog} className="h-10 rounded-lg bg-admin-primary px-4 text-sm hover:bg-admin-primary-hover">
            <Plus aria-hidden="true" className="size-4" />
            Tạo voucher
          </Button>
        )}
      />

      <SpaBookingPromotionPanel {...promotionPanelProps} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Tổng voucher"
          value={isLoading || isError ? "—" : `${stats.total} voucher`}
          icon={<Ticket className="size-5" />}
          tone="primary"
        />
        <AdminMetricCard
          label="Có thể sử dụng"
          value={isLoading || isError ? "—" : `${stats.active} voucher`}
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
          detail="Đã bật, còn hạn và còn lượt"
        />
        <AdminMetricCard
          label="Đổi bằng điểm"
          value={isLoading || isError ? "—" : `${stats.rewards} voucher`}
          icon={<Gift className="size-5" />}
          tone="warning"
        />
      </div>

      <VoucherListFilters searchQuery={searchQuery} onSearchChange={handleSearchChange} />

      {isLoading ? (
        <AdminDataState variant="loading" title="Đang tải danh sách voucher…" className="rounded-2xl border border-border-subtle bg-surface" />
      ) : isError ? (
        <AdminDataState variant="error" title="Không tải được voucher." onRetry={refetch} className="rounded-2xl border border-border-subtle bg-surface" />
      ) : filteredVouchers.length === 0 ? (
        <AdminDataState
          variant="empty"
          title={voucherList.length === 0 ? "Chưa có voucher nào." : "Không tìm thấy voucher phù hợp."}
          description={voucherList.length === 0
            ? "Tạo voucher để quản lý ưu đãi và phần thưởng đổi điểm."
            : "Thử từ khóa khác hoặc xóa nội dung tìm kiếm."}
          action={voucherList.length > 0 && searchQuery ? (
            <Button type="button" variant="link" onClick={() => handleSearchChange("")} className="h-auto p-0 text-sm font-semibold text-admin-primary">
              Xóa tìm kiếm
            </Button>
          ) : undefined}
          className="rounded-2xl border border-border-subtle bg-surface"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleVouchers.map((voucher) => (
            <VoucherCard
              key={voucher.id}
              voucher={voucher}
              onToggleActive={handleToggleVoucherActive}
              onEdit={setVoucherBeingEdited}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && filteredVouchers.length > 0 && (
        <AdminPagination
          from={firstVoucher}
          to={lastVoucher}
          total={filteredVouchers.length}
          itemLabel="voucher"
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      <VoucherFormDialog state={voucherFormState} actions={voucherFormActions} />
      <VoucherEditDialog key={voucherEditKey} {...voucherEditProps} />
    </AdminPageShell>
  );
}
