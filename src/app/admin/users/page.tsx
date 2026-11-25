"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminTableSkeleton } from "@/components/admin/admin-table-skeleton";
import { AdminTableViewport } from "@/components/admin/admin-table-viewport";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AuditLogsList } from "@/components/admin/users/audit-logs-list";
import { UserDetailSheet } from "@/components/admin/users/user-detail-sheet";
import { UserTableRow } from "@/components/admin/users/user-table-row";
import { UserProfileEditDialog } from "@/components/admin/users/user-profile-edit-dialog";
import { UserDirectoryFilters } from "@/components/admin/users/user-directory-filters";
import { RecoverableCustomerAccounts } from "@/components/admin/users/recoverable-customer-accounts";
import { useAdminUsersWorkflow } from "@/hooks/use-admin-users-workflow";
import {
  Users,
  ShieldCheck,
  Shield,
  Award,
  X,
  ScrollText,
} from "lucide-react";

export default function AdminUsersPage() {
  const {
    auditLogsModalOpen,
    currentUser,
    editEmail,
    editPhone,
    editProfileModalOpen,
    firstRow,
    handleConfirmAccountAction,
    handleUpdateRole,
    handleUpdateProfile,
    hasUserFilters,
    isDeleting,
    isEditing,
    isError,
    isFetching,
    isLoading,
    isStatsError,
    isStatsFetching,
    isStatsLoading,
    lastRow,
    page,
    pendingAccountAction,
    refetch,
    refreshUsers,
    roleFilter,
    searchTerm,
    selectedUser,
    setAuditLogsModalOpen,
    setEditEmail,
    setEditPhone,
    setEditProfileModalOpen,
    setPage,
    setPendingAccountAction,
    setRoleFilter,
    setSearchTerm,
    setSelectedUser,
    totalPages,
    totalUsers,
    updateUserStatusMutation,
    userDetailActions,
    userDetailState,
    userStats,
    users,
  } = useAdminUsersWorkflow();
  const filteredUsers = users;

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Quản trị"
        title="Tài khoản & khách hàng"
        description="Tra cứu hồ sơ và lịch sử điểm. Nhân viên cùng xử lý công việc; chỉ quản trị viên được cấp hoặc thu hồi quyền quản trị."
        onRefresh={refreshUsers}
        isRefreshing={isFetching || isStatsFetching}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 md:grid-cols-4">
        <AdminMetricCard label="Tổng tài khoản" value={isStatsLoading || isStatsError ? "—" : userStats?.total ?? 0} icon={<Users className="size-5" />} tone="primary" detail="Tài khoản đang lưu trong hệ thống" />
        <AdminMetricCard label="Khách hàng" value={isStatsLoading || isStatsError ? "—" : userStats?.customers ?? 0} icon={<Award className="size-5" />} tone="warning" detail="Tích điểm để đổi voucher" />
        <AdminMetricCard label="Nhân viên" value={isStatsLoading || isStatsError ? "—" : userStats?.staff ?? 0} icon={<Shield className="size-5" />} tone="primary" detail="Tài khoản nhân viên" />
        <AdminMetricCard label="Quản trị viên" value={isStatsLoading || isStatsError ? "—" : userStats?.admins ?? 0} icon={<ShieldCheck className="size-5" />} tone="neutral" detail="Tài khoản quản trị viên" />
      </div>

      <UserDirectoryFilters
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        onSearchTermChange={(value) => { setPage(1); setSearchTerm(value); }}
        onRoleFilterChange={(value) => { setPage(1); setRoleFilter(value); }}
      />

      {/* Main Table */}
      <div className="bg-surface rounded-xl border border-border-subtle shadow-2xs overflow-hidden">
        {isError ? (
          <AdminDataState variant="error" title="Không tải được khách hàng." onRetry={refetch} />
        ) : !isLoading && filteredUsers.length === 0 ? (
          <AdminDataState
            variant="empty"
            title={hasUserFilters ? "Không tìm thấy tài khoản phù hợp." : "Chưa có tài khoản nào."}
            description={hasUserFilters ? "Thử thay đổi từ khóa hoặc nhóm tài khoản." : undefined}
            action={hasUserFilters ? (
              <Button type="button" variant="link" onClick={() => { setPage(1); setSearchTerm(""); setRoleFilter("ALL"); }} className="h-auto p-0 text-sm font-semibold text-admin-primary">
                Xóa bộ lọc
              </Button>
            ) : undefined}
          />
        ) : (
        <AdminTableViewport label="Danh sách tài khoản và khách hàng">
          <Table className="w-full min-w-[1000px] text-left border-collapse text-sm">
            <TableHeader>
              <TableRow className="border-b border-border-subtle bg-slate-50/75 text-xs font-semibold text-slate-600">
                <TableHead className="py-3 px-4">Người dùng</TableHead>
                <TableHead className="py-3 px-4">Số điện thoại</TableHead>
                <TableHead className="py-3 px-4">Thú cưng</TableHead>
                <TableHead className="py-3 px-4">Điểm tích lũy</TableHead>
                <TableHead className="py-3 px-4">Trạng thái</TableHead>
                <TableHead className="py-3 px-4">Phân quyền</TableHead>
                <TableHead className="py-3 px-4 text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border-subtle" aria-busy={isLoading}>
              {isLoading ? (
                <AdminTableSkeleton columns={7} label="khách hàng" />
              ) : (
                filteredUsers.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    currentUserId={currentUser?.id}
                    onRoleChange={handleUpdateRole}
                    onView={setSelectedUser}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </AdminTableViewport>
        )}
      </div>

      {!isLoading && !isError && filteredUsers.length > 0 && (
        <AdminPagination
          from={firstRow}
          to={lastRow}
          total={totalUsers}
          itemLabel="người dùng"
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      <RecoverableCustomerAccounts />

      <UserDetailSheet state={userDetailState} actions={userDetailActions} />

      <UserProfileEditDialog
        open={editProfileModalOpen}
        userName={selectedUser?.name ?? null}
        email={editEmail}
        phone={editPhone}
        isSaving={isEditing}
        onOpenChange={(open) => setEditProfileModalOpen(open)}
        onEmailChange={setEditEmail}
        onPhoneChange={setEditPhone}
        onSave={handleUpdateProfile}
      />

      {/* Audit Logs Modal */}
      <Dialog open={auditLogsModalOpen && !!selectedUser} onOpenChange={(open) => { if (!open) setAuditLogsModalOpen(false); }}>
        {selectedUser && (
          <DialogContent showCloseButton={false} className="flex max-h-[85dvh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden border-slate-200 bg-surface p-0 sm:max-w-2xl">
            <DialogHeader className="shrink-0 flex-row items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-slate-700" />
                <DialogTitle className="text-sm font-bold text-ink">Lịch sử cập nhật: {selectedUser.name}</DialogTitle>
              </div>
              <DialogDescription className="sr-only">Các thao tác đã ghi nhận trên tài khoản này.</DialogDescription>
              <Button
                type="button"
                onClick={() => setAuditLogsModalOpen(false)}
                variant="ghost"
                size="icon"
                className="size-10 rounded-lg text-slate-400 hover:text-slate-600"
                aria-label="Đóng lịch sử cập nhật"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <AuditLogsList userId={selectedUser.id} />
            </div>
          </DialogContent>
        )}
      </Dialog>

      <AdminConfirmDialog
        open={pendingAccountAction !== null}
        onOpenChange={(open) => { if (!open) setPendingAccountAction(null); }}
        title={pendingAccountAction === "lock"
          ? `Khóa tài khoản ${selectedUser?.name ?? "này"}?`
          : `Xóa tạm thời tài khoản ${selectedUser?.name ?? "này"}?`}
        description={pendingAccountAction === "lock"
          ? "Người dùng sẽ không đăng nhập được cho đến khi quản trị viên hoặc nhân viên mở khóa lại."
          : selectedUser?.role === "CUSTOMER"
            ? "Tài khoản sẽ bị khóa. Email và số điện thoại được giữ 30 ngày để có thể khôi phục; sau thời hạn này, thông tin liên hệ được gỡ nhưng lịch sử giao dịch vẫn được giữ. Không thể xóa khi khách còn lịch hẹn sắp tới."
            : "Tài khoản sẽ bị vô hiệu hóa và thông tin email, số điện thoại được giải phóng. Hệ thống sẽ từ chối thao tác nếu còn lịch hẹn sắp tới."}
        confirmLabel={pendingAccountAction === "lock" ? "Khóa tài khoản" : "Xóa tạm thời"}
        isPending={pendingAccountAction === "lock" ? updateUserStatusMutation.isPending : isDeleting}
        onConfirm={handleConfirmAccountAction}
      />
    </AdminPageShell>
  );
}
