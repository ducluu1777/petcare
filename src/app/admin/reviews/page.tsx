"use client";

import { Award, MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { ReviewListItem } from "@/components/admin/reviews/review-list-item";
import { ReviewListFilters } from "@/components/admin/reviews/review-list-filters";
import { ReviewModerationDialog } from "@/components/admin/reviews/review-moderation-dialog";
import { useAdminReviewsWorkflow } from "@/hooks/use-admin-reviews-workflow";

export default function AdminReviewsPage() {
  const workflow = useAdminReviewsWorkflow();

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Khách hàng"
        title="Đánh giá dịch vụ và sản phẩm"
        description="Theo dõi, lọc và tìm đánh giá của khách hàng."
        onRefresh={workflow.refetch}
        isRefreshing={workflow.isFetching}
      />

      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Điểm trung bình công khai"
          value={workflow.isLoading || workflow.isError ? "— / 5.0" : `${workflow.stats.avg ?? "—"} / 5.0`}
          icon={<Star className="size-5 fill-current" />}
          tone="warning"
        />
        <AdminMetricCard
          label="Đang hiển thị"
          value={workflow.isLoading || workflow.isError ? "—" : `${workflow.visibleReviewCount} lượt`}
          icon={<MessageSquare className="size-5" />}
          tone="primary"
        />
        <AdminMetricCard
          label="Đang ẩn"
          value={workflow.isLoading || workflow.isError ? "—" : `${workflow.hiddenReviewCount} lượt`}
          icon={<MessageSquare className="size-5" />}
          tone="neutral"
        />
        <AdminMetricCard
          label="Tỷ lệ đánh giá 5 sao"
          value={workflow.isLoading || workflow.isError || workflow.stats.fiveStarRate === null
            ? "—"
            : `${workflow.stats.fiveStarRate}%`}
          icon={<Award className="size-5" />}
          tone="success"
        />
      </div>

      <ReviewListFilters
        searchQuery={workflow.searchQuery}
        targetFilter={workflow.targetFilter}
        ratingFilter={workflow.ratingFilter}
        visibilityFilter={workflow.visibilityFilter}
        onSearchChange={workflow.onSearchChange}
        onTargetChange={workflow.onTargetChange}
        onRatingChange={workflow.onRatingChange}
        onVisibilityChange={workflow.onVisibilityChange}
      />

      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xs">
        {workflow.isLoading ? (
          <AdminDataState variant="loading" title="Đang tải danh sách đánh giá…" />
        ) : workflow.isError ? (
          <AdminDataState variant="error" title="Không tải được đánh giá." onRetry={workflow.refetch} />
        ) : workflow.filteredReviews.length === 0 ? (
          <AdminDataState
            variant="empty"
            title={workflow.hasReviewFilters ? "Không tìm thấy đánh giá phù hợp." : "Chưa có đánh giá nào."}
            description={workflow.hasReviewFilters ? "Thử thay đổi hoặc xóa bộ lọc để xem thêm kết quả." : undefined}
            action={workflow.hasReviewFilters ? (
              <Button
                type="button"
                variant="link"
                onClick={workflow.clearFilters}
                className="h-auto p-0 text-sm font-semibold text-admin-primary"
              >
                Xóa bộ lọc
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {workflow.visibleReviews.map((review) => (
              <ReviewListItem key={review.id} review={review} onModerate={workflow.openModeration} />
            ))}
          </div>
        )}
      </div>

      {!workflow.isLoading && !workflow.isError && workflow.filteredReviews.length > 0 && (
        <AdminPagination
          from={workflow.firstReview}
          to={workflow.lastReview}
          total={workflow.filteredReviews.length}
          itemLabel="đánh giá"
          page={workflow.page}
          totalPages={workflow.totalPages}
          onPageChange={workflow.setPage}
        />
      )}

      <ReviewModerationDialog
        open={!!workflow.reviewToModerate}
        review={workflow.reviewToModerate}
        reason={workflow.moderationReason}
        isSaving={workflow.isModerating}
        onReasonChange={workflow.setModerationReason}
        onOpenChange={workflow.handleDialogOpenChange}
        onSubmit={workflow.handleModerate}
      />
    </AdminPageShell>
  );
}
