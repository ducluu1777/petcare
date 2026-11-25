"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BookingNoShowDialogProps {
  open: boolean;
  reason: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export function BookingNoShowDialog({
  open,
  reason,
  isSubmitting,
  onOpenChange,
  onReasonChange,
  onConfirm,
}: BookingNoShowDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ghi nhận khách không đến</DialogTitle>
          <DialogDescription>
            Chỉ ghi nhận sau giờ hẹn ít nhất 20 phút. Lý do sẽ được lưu cùng lịch để đối chiếu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="no-show-reason">Lý do <span aria-hidden="true">*</span></Label>
          <Textarea
            id="no-show-reason"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Ví dụ: Đã gọi điện hai lần nhưng chưa liên hệ được..."
            rows={4}
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Quay lại
          </Button>
          <Button type="button" disabled={!reason.trim() || isSubmitting} onClick={onConfirm}>
            Xác nhận không đến
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
