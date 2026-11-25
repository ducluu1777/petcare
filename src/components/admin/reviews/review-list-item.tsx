import { Calendar, Eye, EyeOff, Scissors, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReviewItem } from "@/hooks/use-reviews";

type AdminReview = ReviewItem & { author?: { name?: string } };

const reviewDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function ReviewListItem({ review, onModerate }: {
  review: AdminReview;
  onModerate: (review: AdminReview) => void;
}) {
  const isService = review.targetType === "SERVICE";
  const authorName = review.author?.name?.trim() || "Khách hàng";
  const initial = authorName === "Khách hàng" ? "K" : authorName.charAt(0).toLocaleUpperCase("vi-VN");

  return (
    <article className="p-4 transition-colors hover:bg-admin-muted-surface/50 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <div aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-admin-primary-light text-xs font-bold text-admin-primary">
            {initial}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-bold text-ink">{authorName}</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-admin-primary/20 bg-admin-primary-light px-2 py-0.5 text-xs font-bold text-admin-primary">
                {isService
                  ? <Scissors aria-hidden="true" className="size-3" />
                  : <ShoppingBag aria-hidden="true" className="size-3" />}
                {isService ? "Dịch vụ" : "Sản phẩm"}
              </span>
              <span className="break-words text-xs text-muted-text">
                {review.targetName || "Chưa có tên mục đánh giá"}
              </span>
            </div>
            <div role="img" className="flex items-center gap-1" aria-label={`Đánh giá ${review.rating.toFixed(1)} trên 5 sao`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  aria-hidden="true"
                  className={`size-3.5 ${star <= review.rating ? "fill-amber-500 text-amber-500" : "text-slate-300"}`}
                />
              ))}
              <span className="ml-1 text-xs font-bold text-ink">{review.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <time
          dateTime={review.createdAt}
          className="flex shrink-0 items-center gap-1 self-start text-xs text-admin-muted sm:self-center"
        >
          <Calendar aria-hidden="true" className="size-3.5" />
          {reviewDateFormatter.format(new Date(review.createdAt))}
        </time>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${review.isHidden ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-800"}`}>
          {review.isHidden ? "Đang ẩn khỏi khách" : "Đang hiển thị"}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={() => onModerate(review)}
          className="h-10 rounded-lg border-border-subtle px-3 text-sm font-semibold text-admin-text-emphasis"
        >
          {review.isHidden
            ? <><Eye aria-hidden="true" className="size-4" /> Hiện lại</>
            : <><EyeOff aria-hidden="true" className="size-4" /> Ẩn đánh giá</>}
        </Button>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-border-subtle bg-admin-muted-surface p-3 text-xs leading-relaxed text-ink">
        {review.comment.trim() || "Khách hàng không để lại nhận xét."}
      </p>
      {review.isHidden && review.moderationReason && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-semibold">Lý do ẩn:</span> {review.moderationReason}
        </p>
      )}
    </article>
  );
}
