import { Button } from "@/components/ui/button";
import type { UserListItem } from "@/hooks/use-users";
import { canChangeManagedUserRole } from "@/lib/admin/user-role-permissions";
import { useAuthStore } from "@/stores/auth-store";
import { CheckCircle2, Edit3, Lock, ScrollText, Trash2, Unlock } from "lucide-react";

interface UserAccountManagementSectionProps {
  user: UserListItem;
  currentUserId?: string;
  roleLabels: Record<UserListItem["role"], string>;
  isDeleting: boolean;
  onUpdateRole: (userId: string, role: UserListItem["role"]) => void;
  onToggleStatus: (userId: string, isActive: boolean) => void;
  onRequestAccountAction: (action: "lock" | "soft-delete") => void;
  onOpenEditProfile: () => void;
  onOpenAuditLogs: () => void;
}

export function UserAccountManagementSection({
  user,
  currentUserId,
  roleLabels,
  isDeleting,
  onUpdateRole,
  onToggleStatus,
  onRequestAccountAction,
  onOpenEditProfile,
  onOpenAuditLogs,
}: UserAccountManagementSectionProps) {
  const isCurrentUser = currentUserId === user.id;
  const actorRole = useAuthStore((state) => state.user?.role);

  return (
    <>
      <section className="space-y-2">
        <h3 id="user-role-heading" className="text-sm font-semibold text-ink">
          Phân quyền hệ thống
        </h3>
        <div role="group" aria-labelledby="user-role-heading" className="grid grid-cols-3 gap-2">
          {(["CUSTOMER", "STAFF", "ADMIN"] as const).map((role) => {
            const canChangeRole = canChangeManagedUserRole(actorRole, user.role, role);
            return (
              <Button
                key={role}
                type="button"
                disabled={isCurrentUser || !canChangeRole}
                onClick={() => onUpdateRole(user.id, role)}
                variant="outline"
                aria-pressed={user.role === role}
                title={isCurrentUser ? "Không thể tự đổi vai trò của mình" : !canChangeRole ? "Chỉ quản trị viên được cấp hoặc thu hồi quyền quản trị" : undefined}
                className={`h-auto w-full rounded-lg px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                  user.role === role
                    ? "border-primary bg-primary text-white shadow-xs"
                    : "border-border-subtle bg-surface text-slate-700 hover:bg-slate-50"
                }`}
              >
                {roleLabels[role]}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-text">
          Nhân viên và quản trị viên cùng xử lý công việc; chỉ quản trị viên được cấp hoặc thu hồi quyền quản trị.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Trạng thái tài khoản</span>
          {user.isActive === false ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
              <Lock className="h-2.5 w-2.5" />
              Đang bị khóa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Đang hoạt động
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {user.isActive === false ? (
            <Button
              type="button"
              onClick={() => onToggleStatus(user.id, true)}
              className="h-auto min-h-10 w-full gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-center text-sm font-bold leading-tight text-white shadow-xs hover:bg-emerald-700"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Kích hoạt lại tài khoản</span>
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isCurrentUser}
              onClick={() => onRequestAccountAction("lock")}
              variant="destructive"
              className="h-auto min-h-10 w-full gap-1.5 rounded-lg border border-rose-200 px-2.5 py-2 text-center text-sm font-bold leading-tight"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Khóa tài khoản</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={onOpenEditProfile}
            variant="outline"
            className="h-auto min-h-10 w-full gap-1.5 rounded-lg border-slate-200 bg-surface px-2.5 py-2 text-center text-sm font-bold leading-tight text-slate-700 shadow-2xs hover:bg-slate-100"
            title="Sửa email hoặc số điện thoại cho khách hàng"
          >
            <Edit3 className="h-3.5 w-3.5 text-primary" />
            <span>Sửa hồ sơ</span>
          </Button>

          <Button
            type="button"
            onClick={onOpenAuditLogs}
            variant="outline"
            className="h-auto min-h-10 w-full gap-1.5 rounded-lg border-slate-200 bg-surface px-2.5 py-2 text-center text-sm font-bold leading-tight text-slate-700 shadow-2xs hover:bg-slate-100"
            title="Xem lịch sử hoạt động"
          >
            <ScrollText className="h-3.5 w-3.5 text-slate-600" />
            <span>Lịch sử</span>
          </Button>

          <Button
            type="button"
            disabled={isDeleting || isCurrentUser}
            onClick={() => onRequestAccountAction("soft-delete")}
            variant="destructive"
            className="h-auto min-h-10 w-full gap-1.5 rounded-lg border border-rose-200 px-2.5 py-2 text-center text-sm font-bold leading-tight shadow-2xs"
            title="Xóa tạm thời tài khoản"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Xóa tạm thời</span>
          </Button>
        </div>
      </section>
    </>
  );
}
