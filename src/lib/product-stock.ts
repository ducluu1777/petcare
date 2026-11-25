type ProductStock = {
  stock: number;
  reservedStock?: number;
};

export function getAvailableProductStock(product: ProductStock): number {
  if (!Number.isFinite(product.stock)) return 0;

  const stock = Math.max(0, Math.floor(product.stock));
  const reservedStock = Number.isFinite(product.reservedStock)
    ? Math.max(0, Math.floor(product.reservedStock ?? 0))
    : 0;

  return Math.max(0, stock - reservedStock);
}
