"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UserListItem } from "@/hooks/use-users";
import { UserCheck, X } from "lucide-react";
import { UserAccountManagementSection } from "@/components/admin/users/user-account-management-section";
import { UserLoyaltySection } from "@/components/admin/users/user-loyalty-section";
import { UserPetsSection } from "@/components/admin/users/user-pets-section";
import { UserProfileSummary } from "@/components/admin/users/user-profile-summary";
import type { LoyaltyTransaction } from "@/hooks/use-loyalty";

interface UserDetailSheetState {
  user: UserListItem | null;
  currentUserId?: string;
  roleLabels: Record<UserListItem["role"], string>;
  isDeleting: boolean;
  loyaltyHistory: LoyaltyTransaction[] | undefined;
  isLoyaltyHistoryLoading: boolean;
  isLoyaltyHistoryError: boolean;
  adjustPointsInput: string;
  adjustReasonInput: string;
  isAdjustingPoints: boolean;
}

interface UserDetailSheetActions {
  onClose: () => void;
  onUpdateRole: (userId: string, role: UserListItem["role"]) => void;
  onToggleStatus: (userId: string, isActive: boolean) => void;
  onRequestAccountAction: (action: "lock" | "soft-delete") => void;
  onOpenEditProfile: () => void;
  onOpenAuditLogs: () => void;
  onAdjustPoints: () => void;
  onAdjustPointsInputChange: (value: string) => void;
  onAdjustReasonInputChange: (value: string) => void;
}

interface UserDetailSheetProps {
  state: UserDetailSheetState;
  actions: UserDetailSheetActions;
}

export function UserDetailSheet({ state, actions }: UserDetailSheetProps) {
  const { user } = state;

  return (
    <Sheet open={Boolean(user)} onOpenChange={(open) => !open && actions.onClose()}>
      {user && (
        <SheetContent side="right" showCloseButton={false} className="w-full max-w-md border-l border-border-subtle bg-surface p-0">
          <SheetHeader className="flex-row items-center justify-between bg-slate-50/50 p-5">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <SheetTitle className="text-sm">Hồ sơ tài khoản</SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              Thông tin tài khoản, điểm tích lũy và thú cưng của {user.name}.
            </SheetDescription>
            <Button
              type="button"
              onClick={actions.onClose}
              variant="ghost"
              size="icon"
              className="size-10 rounded-lg text-muted-text hover:bg-slate-200/80 hover:text-ink"
              aria-label="Đóng hồ sơ tài khoản"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            <UserProfileSummary user={user} />

            <UserAccountManagementSection
              user={user}
              currentUserId={state.currentUserId}
              roleLabels={state.roleLabels}
              isDeleting={state.isDeleting}
              onUpdateRole={actions.onUpdateRole}
              onToggleStatus={actions.onToggleStatus}
              onRequestAccountAction={actions.onRequestAccountAction}
              onOpenEditProfile={actions.onOpenEditProfile}
              onOpenAuditLogs={actions.onOpenAuditLogs}
            />

            <UserLoyaltySection
              points={user.loyaltyPoints}
              history={state.loyaltyHistory}
              isHistoryLoading={state.isLoyaltyHistoryLoading}
              isHistoryError={state.isLoyaltyHistoryError}
              adjustmentInput={state.adjustPointsInput}
              adjustmentReason={state.adjustReasonInput}
              isAdjusting={state.isAdjustingPoints}
              onAdjust={actions.onAdjustPoints}
              onAdjustmentInputChange={actions.onAdjustPointsInputChange}
              onAdjustmentReasonChange={actions.onAdjustReasonInputChange}
            />

            <UserPetsSection pets={user.pets} />
          </div>

          <SheetFooter className="shrink-0 flex-row justify-end bg-slate-50 p-4">
            <Button
              type="button"
              onClick={actions.onClose}
              variant="outline"
              className="h-10 rounded-lg border-border-subtle px-4 text-sm font-bold text-ink hover:bg-slate-100"
            >
              Đóng
            </Button>
          </SheetFooter>
        </SheetContent>
      )}
    </Sheet>
  );
}
