import { describe, expect, it } from "bun:test";
import { formatLoyaltyCopy } from "./loyalty-copy";

describe("Loyalty terminology in existing shop content", () => {
  it.each([
    ["Bạn nhận được 35 điểm thưởng", "Bạn nhận được 35 điểm tích lũy"],
    ["Điểm thưởng và đổi voucher", "Điểm tích lũy và đổi voucher"],
    ["ĐIỂM THƯỞNG", "ĐIỂM TÍCH LŨY"],
    ["Đổi bằng 500 điểm thưởng tích luỹ. Áp dụng từ 400.000đ.", "Đổi bằng 500 điểm tích lũy. Áp dụng từ 400.000đ."],
    ["Đổi bằng 100 điểm thưởng tích lũy", "Đổi bằng 100 điểm tích lũy"],
    ["Cộng 1 điểm\n thưởng", "Cộng 1 điểm tích lũy"],
    ["Bạn có 50 điểm tích lũy", "Bạn có 50 điểm tích lũy"],
    ["Pate Súp Thưởng", "Pate Súp Thưởng"],
  ])("renders %s as %s", (before, after) => {
    expect(formatLoyaltyCopy(before)).toBe(after);
    expect(formatLoyaltyCopy(after)).toBe(after);
  });
});
