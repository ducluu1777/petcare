const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Thức ăn",
  SNACK: "Đồ ăn vặt",
  CARE: "Chăm sóc",
  ACCESSORY: "Phụ kiện",
};

export function getProductCategoryLabel(category: string | null | undefined) {
  return category ? PRODUCT_CATEGORY_LABELS[category] ?? "Khác" : "Khác";
}
