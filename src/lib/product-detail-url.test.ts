import { describe, expect, it } from "bun:test";
import { getProductDetailHref, getProductLoginHref } from "./product-detail-url";

describe("getProductDetailHref", () => {
  it("builds the public detail URL from the product slug", () => {
    expect(getProductDetailHref("pate-royal-canin-mini-adult")).toBe(
      "/cua-hang/pate-royal-canin-mini-adult",
    );
  });
});

describe("getProductLoginHref", () => {
  it("returns an unauthenticated customer to the selected product after login", () => {
    expect(getProductLoginHref("pate-royal-canin-mini-adult")).toBe(
      "/dang-nhap?redirect=%2Fcua-hang%2Fpate-royal-canin-mini-adult",
    );
  });
});
