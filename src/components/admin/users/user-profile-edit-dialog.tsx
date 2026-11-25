"use client";

import { Edit3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type UserProfileEditDialogProps = {
  open: boolean;
  userName: string | null;
  email: string;
  phone: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onEmailChange: (email: string) => void;
  onPhoneChange: (phone: string) => void;
  onSave: () => void;
};

export function UserProfileEditDialog({
  open,
  userName,
  email,
  phone,
  isSaving,
  onOpenChange,
  onEmailChange,
  onPhoneChange,
  onSave,
}: UserProfileEditDialogProps) {
  return (
    <Dialog open={open && userName !== null} onOpenChange={onOpenChange}>
      {userName !== null && (
        <DialogContent showCloseButton={false} className="w-full max-w-[calc(100%-2rem)] overflow-hidden border-slate-200 bg-surface p-0 sm:max-w-md">
          <DialogHeader className="flex-row items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <Edit3 className="size-5 text-primary" />
              <DialogTitle className="text-sm font-bold text-ink">Sửa hồ sơ: {userName}</DialogTitle>
            </div>
            <DialogDescription className="sr-only">Cập nhật email hoặc số điện thoại đăng nhập của khách hàng.</DialogDescription>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="ghost"
              size="icon"
              className="size-10 rounded-lg text-slate-400 hover:text-slate-600"
              aria-label="Đóng biểu mẫu sửa hồ sơ"
            >
              <X className="size-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <div>
              <label htmlFor="user-edit-phone" className="mb-1.5 block text-sm font-semibold text-ink">
                Số điện thoại (Dùng để tích điểm tại quầy)
              </label>
              <Input
                id="user-edit-phone"
                type="text"
                value={phone}
                onChange={(event) => onPhoneChange(event.target.value)}
                placeholder="Nhập số điện thoại..."
                className="w-full rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm text-ink focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary"
              />
            </div>

            <div>
              <label htmlFor="user-edit-email" className="mb-1.5 block text-sm font-semibold text-ink">
                Email (Dùng để đăng nhập / nhận OTP)
              </label>
              <Input
                id="user-edit-email"
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="Nhập email..."
                className="w-full rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm text-ink focus-visible:border-admin-primary focus-visible:ring-2 focus-visible:ring-admin-primary"
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <span className="font-bold">Lưu ý:</span> Việc thay đổi email hoặc số điện thoại sẽ cập nhật trực tiếp thông tin định danh của khách hàng. Khách có thể dùng thông tin mới này để đăng nhập ngay lập tức.
            </div>

            <DialogFooter className="-mx-5 -mb-5 flex-row justify-end border-t border-slate-100 bg-surface p-5">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="h-10 rounded-xl border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                onClick={onSave}
                className="h-10 rounded-xl px-4 text-sm font-semibold shadow-sm"
              >
                {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
