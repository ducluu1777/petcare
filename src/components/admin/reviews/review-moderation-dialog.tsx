"use client";

import { Eye, EyeOff } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewItem } from "@/hooks/use-reviews";

interface ReviewModerationDialogProps {
  open: boolean;
  review: ReviewItem | null;
  reason: string;
  isSaving: boolean;
  onReasonChange: (reason: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export function ReviewModerationDialog({
  open,
  review,
  reason,
  isSaving,
  onReasonChange,
  onOpenChange,
  onSubmit,
}: ReviewModerationDialogProps) {
  const restoring = !!review?.isHidden;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border-subtle bg-surface">
        <DialogHeader>
          <span className={`mb-1 grid size-10 place-items-center rounded-xl ${restoring ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            {restoring ? <Eye aria-hidden="true" className="size-5" /> : <EyeOff aria-hidden="true" className="size-5" />}
          </span>
          <DialogTitle className="text-ink">{restoring ? "Hiện lại đánh giá" : "Ẩn đánh giá khỏi khách hàng"}</DialogTitle>
          <DialogDescription className="text-muted-text">
            {restoring
              ? "Đánh giá sẽ hiển thị lại trên dịch vụ hoặc sản phẩm. Ghi lý do khôi phục để lưu nhật ký."
              : "Đánh giá sẽ không còn hiển thị công khai. Ghi lý do xử lý để lưu nhật ký."}
          </DialogDescription>
        </DialogHeader>

        {review && (
          <form onSubmit={onSubmit} className="space-y-4">
            <blockquote className="max-h-28 overflow-y-auto rounded-lg border border-border-subtle bg-admin-muted-surface p-3 text-sm leading-relaxed text-admin-text-emphasis">
              {review.comment.trim() || "Khách hàng không để lại nhận xét."}
            </blockquote>
            <div className="space-y-2">
              <label htmlFor="review-moderation-reason" className="text-sm font-semibold text-ink">Lý do <span className="text-red-700">*</span></label>
              <Textarea
                id="review-moderation-reason"
                required
                maxLength={500}
                rows={4}
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder={restoring ? "Vì sao đánh giá được hiện lại?" : "Ví dụ: chứa thông tin cá nhân hoặc nội dung không phù hợp."}
                className="resize-y border-admin-border-field bg-surface"
              />
              <p className="text-right text-xs text-muted-text">{reason.length}/500 ký tự</p>
            </div>
            <DialogFooter className="gap-2 border-t border-border-subtle pt-4 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving} className="h-10 rounded-lg">Đóng</Button>
              <Button type="submit" disabled={isSaving || !reason.trim()} className="h-10 rounded-lg bg-admin-primary text-white hover:bg-admin-primary-hover">
                {isSaving ? "Đang lưu…" : restoring ? "Hiện lại đánh giá" : "Ẩn đánh giá"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
