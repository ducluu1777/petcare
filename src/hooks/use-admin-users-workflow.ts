"use client";

import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { useUserLoyaltyHistory } from "@/hooks/use-loyalty";
import {
  useAdjustUserPoints,
  useSoftDeleteUser,
  useUpdateCustomerProfile,
  useUpdateUserRole,
  useUpdateUserStatus,
  useUserDetail,
  useUserStats,
  useUsersList,
  type UserListItem,
} from "@/hooks/use-users";
import { useAuthStore } from "@/stores/auth-store";
import type { UserDirectoryRoleFilter } from "@/components/admin/users/user-directory-filters";

type PendingAccountAction = "lock" | "soft-delete" | null;

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<UserListItem["role"], string> = {
  CUSTOMER: "Khách hàng",
  STAFF: "Nhân viên",
  ADMIN: "Quản trị viên",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useAdminUsersWorkflow() {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserDirectoryRoleFilter>("ALL");
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [pendingAccountAction, setPendingAccountAction] = useState<PendingAccountAction>(null);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [auditLogsModalOpen, setAuditLogsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adjustPointsInput, setAdjustPointsInput] = useState("");
  const [adjustReasonInput, setAdjustReasonInput] = useState("");
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);

  const currentUser = useAuthStore((state) => state.user);
  const hasUserFilters = !!searchTerm.trim() || roleFilter !== "ALL";
  const userStatsQuery = useUserStats();
  const usersQuery = useUsersList({
    role: roleFilter === "ALL" ? undefined : roleFilter,
    search: deferredSearchTerm.trim() || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const loyaltyHistoryQuery = useUserLoyaltyHistory(selectedUser?.id ?? "");
  const userDetailQuery = useUserDetail(selectedUser?.id);

  const updateUserRoleMutation = useUpdateUserRole();
  const updateUserStatusMutation = useUpdateUserStatus();
  const updateProfileMutation = useUpdateCustomerProfile();
  const softDeleteMutation = useSoftDeleteUser();
  const adjustPointsMutation = useAdjustUserPoints();

  const rawList = usersQuery.data?.data ?? (Array.isArray(usersQuery.data) ? usersQuery.data : null);
  const users: UserListItem[] = rawList ? rawList as UserListItem[] : [];
  const totalPages = Math.max(1, usersQuery.data?.meta.totalPages ?? 1);
  const totalUsers = usersQuery.data?.meta.total ?? 0;
  const firstRow = totalUsers === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, totalUsers);

  const handleToggleStatus = async (userId: string, newStatus: boolean) => {
    try {
      await updateUserStatusMutation.mutateAsync({ userId, isActive: newStatus });
      if (selectedUser?.id === userId) {
        setSelectedUser((previous) => previous ? { ...previous, isActive: newStatus } : null);
      }
      toast.success(newStatus ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");
      return true;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể cập nhật trạng thái tài khoản."));
      return false;
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedUser) return;
    setIsEditing(true);
    try {
      await updateProfileMutation.mutateAsync({
        userId: selectedUser.id,
        data: {
          email: editEmail || undefined,
          phone: editPhone || undefined,
        },
      });
      toast.success(`Đã cập nhật thông tin khách hàng ${selectedUser.name}.`);
      setEditProfileModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật hồ sơ khách hàng."));
    } finally {
      setIsEditing(false);
    }
  };

  const handleSoftDelete = async (userId: string) => {
    setIsDeleting(true);
    try {
      await softDeleteMutation.mutateAsync({ userId });
      toast.success("Đã xóa tạm thời tài khoản.");
      if ((usersQuery.data?.data.length ?? 0) === 1 && page > 1) {
        setPage((currentPage) => Math.max(1, currentPage - 1));
      }
      setSelectedUser(null);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa tạm thời tài khoản."));
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmAccountAction = async () => {
    if (!selectedUser || !pendingAccountAction) return;
    const succeeded = pendingAccountAction === "lock"
      ? await handleToggleStatus(selectedUser.id, false)
      : await handleSoftDelete(selectedUser.id);
    if (succeeded) setPendingAccountAction(null);
  };

  const handleUpdateRole = async (userId: string, newRole: UserListItem["role"]) => {
    try {
      await updateUserRoleMutation.mutateAsync({ userId, role: newRole });
      if (selectedUser?.id === userId) {
        setSelectedUser((previous) => previous ? { ...previous, role: newRole } : null);
      }
      if (roleFilter !== "ALL" && roleFilter !== newRole && users.length === 1 && page > 1) {
        setPage((currentPage) => Math.max(1, currentPage - 1));
      }
      toast.success(`Đã chuyển vai trò sang ${ROLE_LABELS[newRole]}.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật quyền người dùng."));
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedUser) return;
    const points = Number(adjustPointsInput);
    if (!Number.isInteger(points) || points === 0) {
      toast.error("Nhập số điểm nguyên khác 0; số dương để cộng, số âm để trừ.");
      return;
    }
    if (!adjustReasonInput.trim()) {
      toast.error("Nhập lý do điều chỉnh điểm.");
      return;
    }
    setIsAdjustingPoints(true);
    try {
      await adjustPointsMutation.mutateAsync({
        userId: selectedUser.id,
        points,
        reason: adjustReasonInput.trim(),
      });
      setSelectedUser((previous) => previous
        ? { ...previous, loyaltyPoints: Math.max(0, previous.loyaltyPoints + points) }
        : null);
      toast.success(`Đã ${points > 0 ? "cộng" : "trừ"} ${Math.abs(points)} điểm cho ${selectedUser.name}.`);
      setAdjustPointsInput("");
      setAdjustReasonInput("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể điều chỉnh điểm tích lũy."));
    } finally {
      setIsAdjustingPoints(false);
    }
  };

  const refreshUsers = async () => {
    await Promise.all([usersQuery.refetch(), userStatsQuery.refetch()]);
  };

  const userDetailState = {
    user: selectedUser && userDetailQuery.data?.id === selectedUser.id
      ? { ...selectedUser, pets: userDetailQuery.data.pets }
      : selectedUser,
    currentUserId: currentUser?.id,
    roleLabels: ROLE_LABELS,
    isDeleting,
    loyaltyHistory: loyaltyHistoryQuery.data,
    isLoyaltyHistoryLoading: loyaltyHistoryQuery.isLoading,
    isLoyaltyHistoryError: loyaltyHistoryQuery.isError,
    adjustPointsInput,
    adjustReasonInput,
    isAdjustingPoints,
  };
  const userDetailActions = {
    onClose: () => setSelectedUser(null),
    onUpdateRole: handleUpdateRole,
    onToggleStatus: handleToggleStatus,
    onRequestAccountAction: setPendingAccountAction,
    onOpenEditProfile: () => {
      if (!selectedUser) return;
      setEditEmail(selectedUser.email || "");
      setEditPhone(selectedUser.phone || "");
      setEditProfileModalOpen(true);
    },
    onOpenAuditLogs: () => setAuditLogsModalOpen(true),
    onAdjustPoints: handleAdjustPoints,
    onAdjustPointsInputChange: setAdjustPointsInput,
    onAdjustReasonInputChange: setAdjustReasonInput,
  };

  return {
    adjustPointsInput,
    adjustReasonInput,
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
    isError: usersQuery.isError,
    isLoading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    isStatsError: userStatsQuery.isError,
    isStatsLoading: userStatsQuery.isLoading,
    isStatsFetching: userStatsQuery.isFetching,
    lastRow,
    page,
    pendingAccountAction,
    refetch: usersQuery.refetch,
    refreshUsers,
    roleFilter,
    searchTerm,
    selectedUser,
    setAdjustPointsInput,
    setAdjustReasonInput,
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
    userStats: userStatsQuery.data,
    users,
  };
}
