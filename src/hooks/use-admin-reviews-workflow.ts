"use client";

import * as React from "react";
import { useAdminReviews, useModerateReview, type ReviewItem } from "@/hooks/use-reviews";
import type {
  ReviewRatingFilter,
  ReviewTargetFilter,
  ReviewVisibilityFilter,
} from "@/components/admin/reviews/review-list-filters";
import { getAdminReviewStats } from "@/lib/admin-review-stats";
import { toast } from "sonner";

type AdminReview = ReviewItem & { author?: { name?: string } };
const PAGE_SIZE = 20;

export function useAdminReviewsWorkflow() {
  const [targetFilter, setTargetFilter] = React.useState<ReviewTargetFilter>("ALL");
  const [ratingFilter, setRatingFilter] = React.useState<ReviewRatingFilter>("ALL");
  const [visibilityFilter, setVisibilityFilter] = React.useState<ReviewVisibilityFilter>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [reviewToModerate, setReviewToModerate] = React.useState<ReviewItem | null>(null);
  const [moderationReason, setModerationReason] = React.useState("");
  const [page, setPage] = React.useState(1);
  const hasReviewFilters = !!searchQuery.trim()
    || targetFilter !== "ALL"
    || ratingFilter !== "ALL"
    || visibilityFilter !== "ALL";

  const reviewsQuery = useAdminReviews();
  const moderationMutation = useModerateReview();

  const reviewList = React.useMemo<AdminReview[]>(
    () => Array.isArray(reviewsQuery.data) ? reviewsQuery.data : [],
    [reviewsQuery.data],
  );
  const filteredReviews = React.useMemo(() => reviewList.filter((review) => {
    const matchTarget = targetFilter === "ALL" || review.targetType === targetFilter;
    const matchRating = ratingFilter === "ALL" || review.rating === ratingFilter;
    const matchVisibility = visibilityFilter === "ALL"
      || (visibilityFilter === "HIDDEN" ? !!review.isHidden : !review.isHidden);
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchSearch = [review.comment, review.author?.name, review.targetName]
      .some((value) => value?.toLowerCase().includes(normalizedSearch));
    return matchTarget && matchRating && matchVisibility && matchSearch;
  }), [reviewList, targetFilter, ratingFilter, visibilityFilter, searchQuery]);

  const visibleReviewList = React.useMemo(
    () => reviewList.filter((review) => !review.isHidden),
    [reviewList],
  );
  const hiddenReviewCount = React.useMemo(
    () => reviewList.filter((review) => review.isHidden).length,
    [reviewList],
  );
  const stats = React.useMemo(() => getAdminReviewStats(visibleReviewList), [visibleReviewList]);
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
  const visibleReviews = filteredReviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstReview = filteredReviews.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastReview = Math.min(page * PAGE_SIZE, filteredReviews.length);

  const handleModerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewToModerate || !moderationReason.trim()) return;
    const isHidden = !reviewToModerate.isHidden;

    try {
      await moderationMutation.mutateAsync({
        id: reviewToModerate.id,
        data: { isHidden, reason: moderationReason.trim() },
      });
      toast.success(isHidden ? "Đã ẩn đánh giá khỏi khách hàng." : "Đã hiển thị lại đánh giá.");
      setReviewToModerate(null);
      setModerationReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái đánh giá.");
    }
  };

  const clearFilters = () => {
    setPage(1);
    setSearchQuery("");
    setTargetFilter("ALL");
    setRatingFilter("ALL");
    setVisibilityFilter("ALL");
  };

  const openModeration = (review: ReviewItem) => {
    setReviewToModerate(review);
    setModerationReason("");
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setReviewToModerate(null);
      setModerationReason("");
    }
  };

  return {
    clearFilters,
    filteredReviews,
    firstReview,
    handleDialogOpenChange,
    handleModerate,
    hasReviewFilters,
    hiddenReviewCount,
    isError: reviewsQuery.isError,
    isFetching: reviewsQuery.isFetching,
    isLoading: reviewsQuery.isLoading,
    isModerating: moderationMutation.isPending,
    lastReview,
    moderationReason,
    onRatingChange: (value: ReviewRatingFilter) => { setPage(1); setRatingFilter(value); },
    onSearchChange: (value: string) => { setPage(1); setSearchQuery(value); },
    onTargetChange: (value: ReviewTargetFilter) => { setPage(1); setTargetFilter(value); },
    onVisibilityChange: (value: ReviewVisibilityFilter) => { setPage(1); setVisibilityFilter(value); },
    openModeration,
    page,
    ratingFilter,
    refetch: reviewsQuery.refetch,
    reviewToModerate,
    searchQuery,
    setModerationReason,
    setPage,
    stats,
    targetFilter,
    totalPages,
    visibleReviewCount: visibleReviewList.length,
    visibleReviews,
    visibilityFilter,
  };
}
