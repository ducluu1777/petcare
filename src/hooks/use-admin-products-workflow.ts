"use client";

import * as React from "react";
import {
  useAdminInventorySummary,
  useAdminProducts,
  useAdjustProductStock,
  useDeleteProduct,
  useUpdateProduct,
  type Product,
  type ProductStockAdjustmentPayload,
} from "@/hooks/use-products";
import type { ProductActiveFilter, ProductCategoryFilter } from "@/components/admin/products/product-list-filters";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export function useAdminProductsWorkflow() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<ProductCategoryFilter>("ALL");
  const [activeFilter, setActiveFilter] = React.useState<ProductActiveFilter>("ACTIVE");
  const [page, setPage] = React.useState(1);
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  const [stockAdjustmentProduct, setStockAdjustmentProduct] = React.useState<Product | null>(null);
  const [stockHistoryProduct, setStockHistoryProduct] = React.useState<Product | null>(null);
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const hasProductFilters = !!searchQuery.trim() || selectedCategory !== "ALL" || activeFilter !== "ALL";

  const productsQuery = useAdminProducts({
    category: selectedCategory === "ALL" ? undefined : selectedCategory,
    search: deferredSearchQuery.trim() || undefined,
    isActive: activeFilter === "ALL" ? undefined : activeFilter === "ACTIVE",
    page,
    limit: PAGE_SIZE,
  });
  const inventoryQuery = useAdminInventorySummary();
  const refetchProducts = productsQuery.refetch;
  const refetchInventory = inventoryQuery.refetch;
  const updateProduct = useUpdateProduct();
  const adjustProductStock = useAdjustProductStock();
  const deleteProduct = useDeleteProduct();

  const products = productsQuery.data?.data ?? [];
  const totalProducts = productsQuery.data?.meta.total ?? 0;
  const totalPages = Math.max(1, productsQuery.data?.meta.totalPages ?? 1);
  const firstProduct = totalProducts === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastProduct = Math.min(page * PAGE_SIZE, totalProducts);

  const refreshInventory = React.useCallback(async () => {
    await Promise.all([refetchProducts(), refetchInventory()]);
  }, [refetchProducts, refetchInventory]);

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      toast.success("Đã xóa sản phẩm chưa phát sinh giao dịch.");
      if (products.length === 1 && page > 1) {
        setPage((currentPage) => Math.max(1, currentPage - 1));
      }
      setProductToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa sản phẩm.");
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await updateProduct.mutateAsync({ id: product.id, data: { isActive: !product.isActive } });
      toast.success(product.isActive ? "Đã ngừng bán sản phẩm." : "Đã mở bán lại sản phẩm.");
      await refreshInventory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái bán.");
    }
  };

  const handleAdjustStock = async (data: ProductStockAdjustmentPayload) => {
    if (!stockAdjustmentProduct) return;
    try {
      const { quantity } = data;
      await adjustProductStock.mutateAsync({ id: stockAdjustmentProduct.id, data });
      toast.success(quantity > 0
        ? `Đã tăng tồn ${stockAdjustmentProduct.name} thêm ${quantity}.`
        : `Đã giảm tồn ${stockAdjustmentProduct.name} ${Math.abs(quantity)}.`);
      setStockAdjustmentProduct(null);
      await refreshInventory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể điều chỉnh tồn kho.");
    }
  };

  const clearFilters = () => {
    setPage(1);
    setSearchQuery("");
    setSelectedCategory("ALL");
    setActiveFilter("ALL");
  };

  return {
    activeFilter,
    clearFilters,
    firstProduct,
    handleDelete,
    handleAdjustStock,
    handleToggleActive,
    hasProductFilters,
    inventorySummary: inventoryQuery.data,
    isDeletePending: deleteProduct.isPending,
    isStockAdjustmentPending: adjustProductStock.isPending,
    isError: productsQuery.isError,
    isFetching: productsQuery.isFetching,
    isLoading: productsQuery.isLoading,
    isSummaryError: inventoryQuery.isError,
    isSummaryFetching: inventoryQuery.isFetching,
    isSummaryLoading: inventoryQuery.isLoading,
    lastProduct,
    openDeleteConfirmation: setProductToDelete,
    openStockAdjustment: setStockAdjustmentProduct,
    openStockHistory: setStockHistoryProduct,
    page,
    products,
    productToDelete,
    stockAdjustmentProduct,
    stockHistoryProduct,
    refreshInventory,
    refetch: refetchProducts,
    searchQuery,
    selectedCategory,
    setPage,
    totalPages,
    totalProducts,
    updateProduct,
    onActiveFilterChange: (value: ProductActiveFilter) => {
      setPage(1);
      setActiveFilter(value);
    },
    onCategoryChange: (value: ProductCategoryFilter) => {
      setPage(1);
      setSelectedCategory(value);
    },
    onSearchChange: (value: string) => {
      setPage(1);
      setSearchQuery(value);
    },
  };
}
