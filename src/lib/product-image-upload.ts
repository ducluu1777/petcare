export function getProductImageUploadError(file: Pick<File, "type" | "size"> | null | undefined): string | null {
  if (!file) return null;
  if (!file.type.startsWith("image/")) return "Chỉ cho phép chọn tệp ảnh.";
  if (file.size <= 0) return "Tệp ảnh đang trống.";
  if (file.size > 5 * 1024 * 1024) return "Ảnh không được vượt quá 5 MB.";
  return null;
}
