import { describe, expect, it } from "bun:test";
import { getAdminReviewStats } from "./admin-review-stats";

describe("getAdminReviewStats", () => {
  it("does not report a perfect score when there are no reviews", () => {
    expect(getAdminReviewStats([])).toEqual({
      total: 0,
      avg: null,
      fiveStarCount: 0,
      fiveStarRate: null,
    });
  });

  it("calculates average and five-star rate from actual ratings", () => {
    expect(getAdminReviewStats([{ rating: 5 }, { rating: 3 }, { rating: 5 }])).toEqual({
      total: 3,
      avg: "4.3",
      fiveStarCount: 2,
      fiveStarRate: 67,
    });
  });
});
