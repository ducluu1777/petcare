"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminPagination } from "@/components/admin/admin-pagination"
import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { AdminDataState } from "@/components/admin/admin-data-state"
import { AdminTableSkeleton } from "@/components/admin/admin-table-skeleton"
import { AdminTableViewport } from "@/components/admin/admin-table-viewport"
import { TransactionTableRow } from "@/components/admin/transactions/transaction-table-row"
import { TransactionDetailSheet } from "@/components/admin/transactions/transaction-detail-sheet"
import { TransactionListFilters } from "@/components/admin/transactions/transaction-list-filters"
import { TransactionSummaryMetrics } from "@/components/admin/transactions/transaction-summary-metrics"
import { Receipt } from "lucide-react"
import { useAdminTransactionsWorkflow } from "@/hooks/use-admin-transactions-workflow"

export default function TransactionsManagementPage() {
  const workflow = useAdminTransactionsWorkflow()

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Tài chính"
        title="Giao dịch"
        description="Chọn khoảng ngày để xem doanh thu; lọc giao dịch theo nguồn, hình thức thanh toán hoặc từ khóa."
        onRefresh={workflow.refetch}
        isRefreshing={workflow.isFetching}
      />

      <TransactionSummaryMetrics
        isLoading={workflow.isLoading}
        isError={workflow.isError}
        totalRevenue={workflow.totalRevenue}
        qrRevenue={workflow.qrRevenue}
        cashRevenue={workflow.cashRevenue}
        transactionCount={workflow.transactionCount}
        qrCount={workflow.qrCount}
        cashCount={workflow.cashCount}
        periodLabel={workflow.periodLabel}
      />

      <TransactionListFilters
        methodFilter={workflow.methodFilter}
        sourceFilter={workflow.sourceFilter}
        searchQuery={workflow.searchQuery}
        dateFrom={workflow.dateFrom}
        dateTo={workflow.dateTo}
        hasInvalidDateRange={workflow.hasInvalidDateRange}
        allCount={workflow.isLoading || workflow.isError ? null : workflow.transactionCount}
        qrCount={workflow.isLoading || workflow.isError ? null : workflow.qrCount}
        cashCount={workflow.isLoading || workflow.isError ? null : workflow.cashCount}
        sourceCounts={workflow.isLoading || workflow.isError ? null : workflow.sourceCounts}
        onMethodChange={workflow.onMethodChange}
        onSourceChange={workflow.onSourceChange}
        onSearchChange={workflow.onSearchChange}
        onDateFromChange={workflow.onDateFromChange}
        onDateToChange={workflow.onDateToChange}
      />

      <Card className="bg-surface border-border-subtle shadow-xs overflow-hidden rounded-xl">
        {workflow.isError ? (
          <AdminDataState variant="error" title="Không tải được giao dịch." onRetry={workflow.refetch} />
        ) : !workflow.isLoading && workflow.filteredTransactions.length === 0 ? (
          <AdminDataState
            variant="empty"
            title={workflow.hasInvalidDateRange
              ? "Khoảng thời gian chưa hợp lệ."
              : workflow.hasTransactionFilters
                ? "Không tìm thấy giao dịch phù hợp."
                : "Chưa có giao dịch nào."}
            description={workflow.hasInvalidDateRange
              ? "Ngày bắt đầu phải trước hoặc cùng ngày kết thúc."
              : workflow.hasTransactionFilters
                ? "Thử thay đổi khoảng ngày, nguồn, hình thức thanh toán hoặc từ khóa."
                : "Các khoản thu và hoàn từ lịch hẹn, đơn hàng và bán tại quầy sẽ hiển thị tại đây."}
            action={workflow.hasTransactionFilters ? (
              <Button
                type="button"
                variant="link"
                onClick={workflow.clearFilters}
                className="h-auto p-0 text-sm font-semibold text-admin-primary"
              >
                Xóa bộ lọc
              </Button>
            ) : undefined}
            icon={<Receipt aria-hidden="true" className="size-6 text-admin-muted" />}
          />
        ) : (
          <CardContent className="p-0">
            <AdminTableViewport label="Danh sách giao dịch">
              <Table className="min-w-[1100px]">
                <TableHeader className="bg-slate-100/80 border-b border-border-subtle">
                  <TableRow className="hover:bg-transparent border-border-subtle">
                    <TableHead className="w-[130px] text-sm font-semibold text-slate-600">Mã giao dịch</TableHead>
                    <TableHead className="w-[120px] text-sm font-semibold text-slate-600">Mã lịch / đơn</TableHead>
                    <TableHead className="w-[220px] text-sm font-semibold text-slate-600">Khách hàng &amp; nội dung</TableHead>
                    <TableHead className="w-[150px] text-sm font-semibold text-slate-600">Loại giao dịch</TableHead>
                    <TableHead className="w-[150px] text-sm font-semibold text-slate-600">Hình thức</TableHead>
                    <TableHead className="w-[160px] text-sm font-semibold text-slate-600">Số tiền (VNĐ)</TableHead>
                    <TableHead className="text-sm font-semibold text-slate-600">Thời gian</TableHead>
                    <TableHead className="w-[90px] text-right text-sm font-semibold text-slate-600">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody aria-busy={workflow.isLoading}>
                  {workflow.isLoading ? (
                    <AdminTableSkeleton columns={8} label="giao dịch" />
                  ) : (
                    workflow.visibleTransactions.map((transaction) => (
                      <TransactionTableRow
                        key={transaction.id}
                        transaction={transaction}
                        onOpenDetail={workflow.handleOpenDetail}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </AdminTableViewport>
          </CardContent>
        )}
      </Card>

      {!workflow.isLoading && !workflow.isError && workflow.filteredTransactions.length > 0 && (
        <AdminPagination
          from={workflow.firstTransaction}
          to={workflow.lastTransaction}
          total={workflow.filteredTransactions.length}
          itemLabel="giao dịch"
          page={workflow.page}
          totalPages={workflow.totalPages}
          onPageChange={workflow.setPage}
        />
      )}

      <TransactionDetailSheet
        transaction={workflow.selectedTx}
        open={workflow.isSheetOpen}
        onOpenChange={workflow.onSheetOpenChange}
      />
    </AdminPageShell>
  )
}
