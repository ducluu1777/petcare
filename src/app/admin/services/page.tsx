"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminTableSkeleton } from "@/components/admin/admin-table-skeleton";
import { AdminTableViewport } from "@/components/admin/admin-table-viewport";
import { ServiceTableRow } from "@/components/admin/services/service-table-row";
import { ServiceEditorSheet } from "@/components/admin/services/service-editor-sheet";
import { ServiceListFilters } from "@/components/admin/services/service-list-filters";
import { useAdminServicesWorkflow } from "@/hooks/use-admin-services-workflow";
import { Plus, Scissors, Tag, Info, Layers } from "lucide-react";

export default function ServicesManagementPage() {
  const {
    isLoading,
    isError,
    isFetching,
    refetch,
    operationalServices,
    activeOperationalServices,
    spaCount,
    addonCount,
    vaccinationCount,
    filteredServices,
    categoryFilter,
    setCategoryFilter,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    hasServiceFilters,
    isDeleteConfirmationOpen,
    setIsDeleteConfirmationOpen,
    isSubmitting,
    editingServiceHasReferences,
    isUpdatingService,
    serviceEditorState,
    serviceEditorActions,
    handleOpenCreate,
    handleOpenEdit,
    handleDelete,
    handleToggleActive,
    clearFilters,
  } = useAdminServicesWorkflow();

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Dịch vụ"
        title="Quản lý dịch vụ"
        description="Quản lý danh mục, trạng thái cung cấp và bảng giá theo cân nặng."
        onRefresh={refetch}
        isRefreshing={isFetching}
        actions={(
          <>
            <Badge variant="outline" className="border-border-subtle bg-admin-muted-surface text-xs text-muted-text">
              {isLoading || isError ? "Số liệu chưa khả dụng" : `${activeOperationalServices.length} dịch vụ đang cung cấp`}
            </Badge>
            <Button type="button" onClick={handleOpenCreate} className="h-10 rounded-lg bg-admin-primary px-4 text-sm hover:bg-admin-primary-hover">
              <Plus aria-hidden="true" className="size-4" />
              Thêm dịch vụ
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Dịch vụ Spa" value={isLoading || isError ? "—" : `${spaCount} gói`} icon={<Scissors className="size-5" />} tone="primary" detail="Tắm sấy và chăm sóc" />
        <AdminMetricCard label="Dịch vụ bổ sung" value={isLoading || isError ? "—" : `${addonCount} dịch vụ`} icon={<Tag className="size-5" />} tone="neutral" detail="Lựa chọn bổ sung" />
        <AdminMetricCard label="Yêu cầu tiêm phòng" value={isLoading || isError ? "—" : `${vaccinationCount} gói`} icon={<Info className="size-5" />} tone="success" detail="Cần kiểm tra khi tiếp nhận" />
      </div>

      <ServiceListFilters
        categoryFilter={categoryFilter}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        totalCount={isLoading || isError ? null : operationalServices.length}
        spaCount={isLoading || isError ? null : spaCount}
        addonCount={isLoading || isError ? null : addonCount}
        onCategoryFilterChange={setCategoryFilter}
        onActiveFilterChange={setActiveFilter}
        onSearchQueryChange={setSearchQuery}
      />

      <Card className="overflow-hidden rounded-xl border-border-subtle bg-surface shadow-xs">
        {isError ? (
          <AdminDataState variant="error" title="Không tải được dịch vụ." onRetry={refetch} />
        ) : !isLoading && filteredServices.length === 0 ? (
          <AdminDataState
            variant="empty"
            title={hasServiceFilters ? "Không tìm thấy dịch vụ phù hợp." : "Chưa có dịch vụ nào."}
            description={hasServiceFilters
              ? "Thử thay đổi từ khóa, nhóm hoặc trạng thái cung cấp."
              : "Thêm dịch vụ để thiết lập thông tin và bảng giá."}
            action={hasServiceFilters ? (
              <Button type="button" variant="link" onClick={clearFilters} className="h-auto p-0 text-sm font-semibold text-admin-primary">
                Xóa bộ lọc
              </Button>
            ) : undefined}
            icon={<Layers aria-hidden="true" className="size-6 text-admin-muted" />}
          />
        ) : (
        <CardContent className="p-0">
          <AdminTableViewport label="Danh sách dịch vụ">
            <Table className="min-w-[820px]">
              <TableHeader className="border-b border-border-subtle bg-slate-100/80">
                <TableRow className="border-border-subtle hover:bg-transparent">
                  <TableHead className="w-[140px] text-sm font-semibold text-slate-600">Mã dịch vụ</TableHead>
                  <TableHead className="text-sm font-semibold text-slate-600">Tên dịch vụ</TableHead>
                  <TableHead className="w-[160px] text-sm font-semibold text-slate-600">Các mức giá</TableHead>
                  <TableHead className="w-[150px] text-sm font-semibold text-slate-600">Giá thấp nhất</TableHead>
                  <TableHead className="w-[120px] text-sm font-semibold text-slate-600">Phân loại</TableHead>
                  <TableHead className="w-[130px] text-sm font-semibold text-slate-600">Trạng thái</TableHead>
                  <TableHead className="w-[90px] text-right text-sm font-semibold text-slate-600">Chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody aria-busy={isLoading}>
                {isLoading ? (
                  <AdminTableSkeleton columns={7} label="dịch vụ" />
                ) : (
                  filteredServices.map((service) => (
                    <ServiceTableRow
                      key={service.id}
                      service={service}
                      isUpdating={isUpdatingService}
                      onToggleActive={handleToggleActive}
                      onEdit={handleOpenEdit}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </AdminTableViewport>
        </CardContent>
        )}
      </Card>

      <ServiceEditorSheet state={serviceEditorState} actions={serviceEditorActions} />
      <AdminConfirmDialog
        open={isDeleteConfirmationOpen}
        onOpenChange={setIsDeleteConfirmationOpen}
        title="Xóa dịch vụ chưa có lịch sử?"
        description="Chỉ xóa vĩnh viễn dịch vụ chưa từng có lịch đặt. Nếu dịch vụ đã có lịch, hãy tạm ngừng cung cấp để giữ lại lịch sử."
        confirmLabel="Xóa vĩnh viễn"
        isPending={isSubmitting || editingServiceHasReferences}
        onConfirm={handleDelete}
      />
    </AdminPageShell>
  );
}
