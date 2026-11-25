import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import type { UserListItem } from "@/hooks/use-users";
import { canChangeManagedUserRole } from "@/lib/admin/user-role-permissions";
import { useAuthStore } from "@/stores/auth-store";
import { CheckCircle2, ChevronRight, Dog, Lock, Mail, Phone, Shield, ShieldCheck } from "lucide-react";

type UserRole = UserListItem["role"];

interface UserTableRowProps {
  user: UserListItem;
  currentUserId?: string;
  onRoleChange: (userId: string, role: UserRole) => void;
  onView: (user: UserListItem) => void;
}

export function UserTableRow({ user, currentUserId, onRoleChange, onView }: UserTableRowProps) {
  const actorRole = useAuthStore((state) => state.user?.role);
  const canManageCurrentRole = canChangeManagedUserRole(actorRole, user.role, user.role);

  return (
    <TableRow className="group transition-colors hover:bg-slate-50/80">
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 shrink-0 border border-slate-200">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback className="text-xs font-bold text-primary">
              {user.name.trim().charAt(0).toLocaleUpperCase("vi-VN") || "K"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 truncate font-bold text-ink">
              <span>{user.name}</span>
              {user.role === "ADMIN" && (
                <span title="Quản trị viên"><ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-purple-600" /></span>
              )}
              {user.role === "STAFF" && (
                <span title="Nhân viên"><Shield aria-hidden="true" className="size-3.5 shrink-0 text-primary" /></span>
              )}
            </div>
            <div className="flex items-center gap-1 truncate text-xs text-muted-text">
              <Mail aria-hidden="true" className="size-3 shrink-0 text-slate-400" />
              <span>{user.email || "Chưa có email"}</span>
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-4 py-3 font-medium tabular-nums text-slate-700">
        {user.phone ? (
          <span className="flex items-center gap-1"><Phone aria-hidden="true" className="size-3 text-slate-400" />{user.phone}</span>
        ) : (
          <span className="italic text-slate-400">Chưa cập nhật số điện thoại</span>
        )}
      </TableCell>

      <TableCell className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          <Dog aria-hidden="true" className="size-3.5 text-slate-500" />
          <span className="font-bold tabular-nums">{user.pets?.length ?? user._count?.pets ?? 0}</span>
          <span>thú cưng</span>
        </span>
      </TableCell>

      <TableCell className="px-4 py-3">
        <div className="text-sm tabular-nums text-muted-text">
          <strong>{user.loyaltyPoints.toLocaleString("vi-VN")}</strong> điểm
          <div className="text-xs">Dùng để đổi voucher</div>
        </div>
      </TableCell>

      <TableCell className="px-4 py-3">
        {user.isActive === false ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
            <Lock aria-hidden="true" className="size-2.5" /> Đã khóa
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 aria-hidden="true" className="size-2.5" /> Hoạt động
          </span>
        )}
      </TableCell>

      <TableCell className="px-4 py-3">
        <Select items={{ CUSTOMER: "Khách hàng", STAFF: "Nhân viên", ADMIN: "Quản trị viên" }} value={user.role} onValueChange={(value) => {
          if (value && canChangeManagedUserRole(actorRole, user.role, value as UserRole)) {
            onRoleChange(user.id, value as UserRole);
          }
        }}>
          <SelectTrigger
            aria-label={`Vai trò của ${user.name}`}
            disabled={currentUserId === user.id || !canManageCurrentRole}
            title={currentUserId === user.id ? "Không thể tự đổi vai trò của mình" : !canManageCurrentRole ? "Chỉ quản trị viên được thay đổi vai trò tài khoản quản trị" : undefined}
            className={`h-10 cursor-pointer rounded-lg border text-sm font-semibold transition-colors ${
              user.role === "ADMIN"
                ? "border-purple-200 bg-purple-50 text-purple-800"
                : user.role === "STAFF"
                  ? "border-teal-200 bg-teal-50 text-primary"
                  : "border-slate-200 bg-slate-100 text-slate-700"
            }`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CUSTOMER" disabled={!canChangeManagedUserRole(actorRole, user.role, "CUSTOMER")}>Khách hàng</SelectItem>
            <SelectItem value="STAFF" disabled={!canChangeManagedUserRole(actorRole, user.role, "STAFF")}>Nhân viên</SelectItem>
            <SelectItem value="ADMIN" disabled={!canChangeManagedUserRole(actorRole, user.role, "ADMIN")}>Quản trị viên</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="px-4 py-3 text-right">
        <Button
          type="button"
          onClick={() => onView(user)}
          variant="ghost"
          size="icon"
          className="size-10 rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-ink"
          aria-label={`Xem hồ sơ của ${user.name}`}
          title="Xem chi tiết hồ sơ"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
