"use client";

import { Package, Plus, AlertTriangle, ShoppingCart, X, Tag } from "lucide-react";
import { useAdminProductsWorkflow } from "@/hooks/use-admin-products-workflow";
import { useProductFormWorkflow } from "@/hooks/use-product-form-workflow";
import { useCounterSaleWorkflow } from "@/hooks/use-counter-sale-workflow";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { ProductDirectoryTable } from "@/components/admin/products/product-directory-table";
import { CounterSaleDialog } from "@/components/admin/products/counter-sale-dialog";
import { ProductFormDialog } from "@/components/admin/products/product-form-dialog";
import { ProductListFilters } from "@/components/admin/products/product-list-filters";
import { StockAdjustmentDialog } from "@/components/admin/products/stock-adjustment-dialog";
import { StockMovementHistoryDialog } from "@/components/admin/products/stock-movement-history-dialog";
import { useAuthStore } from "@/stores/auth-store";

const formatVND = (price: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
}).format(price);

export default function AdminProductsPage() {
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");
  const workflow = useAdminProductsWorkflow();
  const productForm = useProductFormWorkflow({ updateProduct: workflow.updateProduct });
  const counterSale = useCounterSaleWorkflow({ onInventoryChange: workflow.refreshInventory });

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Kho hàng"
        subsection="Sản phẩm"
        title="Sản phẩm và tồn kho"
        description="Quản lý sản phẩm đang bán, tồn kho và mặt hàng đã ngừng bán."
        onRefresh={workflow.refreshInventory}
        isRefreshing={workflow.isFetching || workflow.isSummaryFetching}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={counterSale.open}
              className="h-10 rounded-lg border-admin-primary/30 px-4 text-sm text-admin-primary hover:bg-admin-primary-light"
            >
              <ShoppingCart aria-hidden="true" className="size-4" />
              Bán tại quầy
            </Button>
            {isAdmin && (
              <Button
                type="button"
                onClick={productForm.openCreate}
                className="h-10 rounded-lg bg-admin-primary px-4 text-sm hover:bg-admin-primary-hover"
              >
                <Plus aria-hidden="true" className="size-4" />
                Thêm sản phẩm
              </Button>
            )}
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Sản phẩm đang kinh doanh"
          value={workflow.isSummaryLoading || workflow.isSummaryError ? "—" : workflow.inventorySummary?.total ?? 0}
          icon={<Package className="size-5" />}
          tone="primary"
        />
        <AdminMetricCard
          label={`Sản phẩm sắp hết (1–${LOW_STOCK_THRESHOLD} khả dụng)`}
          value={workflow.isSummaryLoading || workflow.isSummaryError ? "—" : workflow.inventorySummary?.lowStock ?? 0}
          icon={<AlertTriangle className="size-5" />}
          tone="warning"
        />
        <AdminMetricCard
          label="Không còn tồn khả dụng"
          value={workflow.isSummaryLoading || workflow.isSummaryError ? "—" : workflow.inventorySummary?.outOfStock ?? 0}
          icon={<X className="size-5" />}
          tone="danger"
        />
        <AdminMetricCard
          label="Giá trị tồn kho"
          value={workflow.isSummaryLoading || workflow.isSummaryError
            ? "—"
            : formatVND(workflow.inventorySummary?.totalInventoryValue ?? 0)}
          icon={<Tag className="size-5" />}
          tone="success"
        />
      </div>

      {workflow.isSummaryError && (
        <p role="alert" className="text-xs text-rose-700">
          Không tải được số liệu tổng quan kho. Thử tải lại để cập nhật.
        </p>
      )}

      <ProductListFilters
        searchQuery={workflow.searchQuery}
        selectedCategory={workflow.selectedCategory}
        activeFilter={workflow.activeFilter}
        onSearchChange={workflow.onSearchChange}
        onCategoryChange={workflow.onCategoryChange}
        onActiveFilterChange={workflow.onActiveFilterChange}
      />

      <ProductDirectoryTable
        products={workflow.products}
        isLoading={workflow.isLoading}
        isError={workflow.isError}
        hasFilters={workflow.hasProductFilters}
        onRetry={workflow.refetch}
        onClearFilters={workflow.clearFilters}
        formatVND={formatVND}
        canManageCatalog={isAdmin}
        onToggleActive={workflow.handleToggleActive}
        onEdit={productForm.openEdit}
        onDelete={workflow.openDeleteConfirmation}
        onAdjustStock={workflow.openStockAdjustment}
        onViewStockHistory={workflow.openStockHistory}
      />

      {!workflow.isLoading && !workflow.isError && workflow.products.length > 0 && (
        <AdminPagination
          from={workflow.firstProduct}
          to={workflow.lastProduct}
          total={workflow.totalProducts}
          itemLabel="sản phẩm"
          page={workflow.page}
          totalPages={workflow.totalPages}
          onPageChange={workflow.setPage}
        />
      )}

      <ProductFormDialog state={productForm.state} actions={productForm.actions} />
      <StockAdjustmentDialog
        open={!!workflow.stockAdjustmentProduct}
        product={workflow.stockAdjustmentProduct}
        isSaving={workflow.isStockAdjustmentPending}
        onOpenChange={(open) => { if (!open) workflow.openStockAdjustment(null); }}
        onSubmit={workflow.handleAdjustStock}
      />
      <StockMovementHistoryDialog
        open={!!workflow.stockHistoryProduct}
        product={workflow.stockHistoryProduct}
        onOpenChange={(open) => { if (!open) workflow.openStockHistory(null); }}
      />
      <CounterSaleDialog state={counterSale.state} actions={counterSale.actions} />
      <AdminConfirmDialog
        open={!!workflow.productToDelete}
        onOpenChange={(open) => { if (!open) workflow.openDeleteConfirmation(null); }}
        title="Xóa sản phẩm chưa có lịch sử?"
        description={workflow.productToDelete
          ? `Sản phẩm “${workflow.productToDelete.name}” sẽ bị xóa vĩnh viễn. Sản phẩm đã có dòng đơn hàng cần dùng thao tác Ngừng bán để giữ lịch sử.`
          : "Chỉ xóa được sản phẩm chưa được dùng trong đơn hàng."}
        confirmLabel="Xóa vĩnh viễn"
        isPending={workflow.isDeletePending}
        onConfirm={workflow.handleDelete}
      />
    </AdminPageShell>
  );
}
