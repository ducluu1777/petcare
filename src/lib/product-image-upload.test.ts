import { describe, expect, it } from "bun:test";
import { getProductImageUploadError } from "./product-image-upload";

describe("product image upload validation", () => {
  it("accepts supported image files up to five megabytes", () => {
    expect(getProductImageUploadError({ type: "image/png", size: 5 * 1024 * 1024 })).toBeNull();
  });

  it("rejects non-image and oversized files before uploading", () => {
    expect(getProductImageUploadError({ type: "text/plain", size: 100 })).toBe("Chỉ cho phép chọn tệp ảnh.");
    expect(getProductImageUploadError({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toBe("Ảnh không được vượt quá 5 MB.");
  });
});
