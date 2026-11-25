import { isCategorySelected } from './admin-category-validation';

interface ProductFormValues {
  name: string;
  description: string;
  category: string;
  price: number | undefined;
  stock: number | undefined;
  originalPrice: string;
}

export function getProductFormError(values: ProductFormValues, isEditing: boolean): string | null {
  if (!values.name.trim()) return 'Nhập tên sản phẩm trước khi lưu.';
  if (!isCategorySelected(values.category)) return 'Chọn danh mục sản phẩm trước khi lưu.';
  if (values.price === undefined || !Number.isInteger(values.price) || values.price <= 0) {
    return 'Nhập giá bán thực tế là số nguyên lớn hơn 0đ.';
  }
  if (!isEditing && (values.stock === undefined || !Number.isInteger(values.stock) || values.stock < 0)) {
    return 'Nhập số tồn kho thực tế là số nguyên từ 0 trở lên.';
  }
  const originalPrice = values.originalPrice.trim() === '' ? null : Number(values.originalPrice);
  if (originalPrice !== null && (!Number.isInteger(originalPrice) || originalPrice < 0)) {
    return 'Giá niêm yết phải là số nguyên từ 0 trở lên hoặc để trống.';
  }
  if (!values.description.trim()) return 'Nhập mô tả sản phẩm trước khi lưu.';
  return null;
}
