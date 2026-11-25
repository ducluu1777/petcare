import { describe, expect, it } from "bun:test";
import { isCategorySelected } from "@/lib/admin-category-validation";

describe("isCategorySelected", () => {
  it("rejects an unselected or whitespace-only category", () => {
    expect(isCategorySelected("")).toBe(false);
    expect(isCategorySelected("   ")).toBe(false);
  });

  it("accepts a selected product or service category", () => {
    expect(isCategorySelected("FOOD")).toBe(true);
    expect(isCategorySelected("BATH")).toBe(true);
  });
});
