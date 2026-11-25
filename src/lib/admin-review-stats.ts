type ReviewRating = { rating?: number | null };

export function getAdminReviewStats(reviews: readonly ReviewRating[]) {
  const total = reviews.length;
  if (total === 0) {
    return { total: 0, avg: null, fiveStarCount: 0, fiveStarRate: null };
  }

  const sum = reviews.reduce((acc, review) => acc + (review.rating || 5), 0);
  const fiveStarCount = reviews.filter((review) => review.rating === 5).length;

  return {
    total,
    avg: (sum / total).toFixed(1),
    fiveStarCount,
    fiveStarRate: Math.round((fiveStarCount / total) * 100),
  };
}
