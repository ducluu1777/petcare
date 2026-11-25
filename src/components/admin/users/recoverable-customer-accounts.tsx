"use client";

import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { Clock3, RotateCcw, Search } from "lucide-react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableSkeleton } from "@/components/admin/admin-table-skeleton";
import { AdminTableViewport } from "@/components/admin/admin-table-viewport";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useRecoverableCustomerAccounts,
  useRestoreCustomerAccount,
  type RecoverableCustomerAccount,
} from "@/hooks/use-recoverable-customer-accounts";

const PAGE_SIZE = 10;
const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function formatVietnamDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RecoverableCustomerAccounts() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [accountToRestore, setAccountToRestore] = useState<RecoverableCustomerAccount | null>(null);
  const accountsQuery = useRecoverableCustomerAccounts({
    search: deferredSearch.trim() || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const restoreMutation = useRestoreCustomerAccount();
  const accounts = accountsQuery.data?.data ?? [];
  const total = accountsQuery.data?.meta.total ?? 0;
  const totalPages = Math.max(1, accountsQuery.data?.meta.totalPages ?? 1);

  const handleRestore = async () => {
    if (!accountToRestore) return;

    try {
      await restoreMutation.mutateAsync({ userId: accountToRestore.id });
      toast.success(`Đã khôi phục tài khoản của ${accountToRestore.name}.`);
      if (accounts.length === 1 && page > 1) setPage((currentPage) => currentPage - 1);
      setAccountToRestore(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể khôi phục tài khoản."));
    }
  };

  return (
    <section aria-labelledby="recoverable-accounts-title" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="size-4 text-admin-primary" />
            <h2 id="recoverable-accounts-title" className="text-sm font-semibold text-ink">
              Tài khoản khách chờ khôi phục
            </h2>
            <span className="rounded-full bg-admin-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-admin-primary">
              {accountsQuery.isError ? "—" : total}
            </span>
          </div>
          <p className="max-w-2xl text-xs leading-5 text-muted-text">
            Email và số điện thoại được giữ trong 30 ngày. Hết hạn, PetCare gỡ thông tin liên hệ nhưng vẫn giữ lịch sử giao dịch.
          </p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
          <Input
            aria-label="Tìm tài khoản khách chờ khôi phục"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Tìm tên, email hoặc SĐT"
            className="h-10 pl-9 text-sm"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
        {accountsQuery.isError ? (
          <AdminDataState
            variant="error"
            title="Không tải được tài khoản chờ khôi phục."
            description="Thử tải lại danh sách; tài khoản bị xóa vẫn giữ nguyên trạng thái trong thời gian này."
            onRetry={accountsQuery.refetch}
          />
        ) : !accountsQuery.isLoading && accounts.length === 0 ? (
          <AdminDataState
            variant="empty"
            title={search.trim() ? "Không tìm thấy tài khoản phù hợp." : "Không có tài khoản khách chờ khôi phục."}
            description={search.trim() ? "Thử tên, email hoặc số điện thoại khác." : "Tài khoản khách bị xóa tạm sẽ xuất hiện ở đây trong 30 ngày."}
          />
        ) : (
          <AdminTableViewport label="Tài khoản khách chờ khôi phục">
            <Table className="w-full min-w-[780px] text-left text-sm">
              <TableHeader>
                <TableRow className="border-b border-border-subtle bg-slate-50/75 text-xs font-semibold text-slate-600">
                  <TableHead className="px-4 py-3">Khách hàng</TableHead>
                  <TableHead className="px-4 py-3">Xóa tạm lúc</TableHead>
                  <TableHead className="px-4 py-3">Có thể khôi phục đến</TableHead>
                  <TableHead className="px-4 py-3 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody aria-busy={accountsQuery.isLoading}>
                {accountsQuery.isLoading ? (
                  <AdminTableSkeleton columns={4} label="tài khoản chờ khôi phục" />
                ) : accounts.map((account) => {
                  const deletedAt = new Date(account.deletedAt);
                  const recoveryDeadline = new Date(deletedAt.getTime() + RECOVERY_WINDOW_MS);

                  return (
                    <TableRow key={account.id} className="border-b border-border-subtle last:border-0">
                      <TableCell className="px-4 py-3">
                        <p className="font-semibold text-ink">{account.name}</p>
                        <p className="mt-1 text-xs text-muted-text">
                          {[account.email, account.phone].filter(Boolean).join(" · ") || "Không có thông tin liên hệ"}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-ink">{formatVietnamDate(deletedAt)}</TableCell>
                      <TableCell className="px-4 py-3 text-xs font-medium text-ink">{formatVietnamDate(recoveryDeadline)}</TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10"
                          onClick={() => setAccountToRestore(account)}
                          aria-label={`Khôi phục tài khoản của ${account.name}`}
                        >
                          <RotateCcw aria-hidden="true" />
                          Khôi phục
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AdminTableViewport>
        )}
      </div>

      {!accountsQuery.isLoading && !accountsQuery.isError && total > 0 && (
        <AdminPagination
          from={(page - 1) * PAGE_SIZE + 1}
          to={Math.min(page * PAGE_SIZE, total)}
          total={total}
          itemLabel="tài khoản chờ khôi phục"
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      <Dialog
        open={accountToRestore !== null}
        onOpenChange={(open) => { if (!open) setAccountToRestore(null); }}
      >
        <DialogContent
          role="alertdialog"
          showCloseButton={false}
          className="max-w-[calc(100%-2rem)] gap-5 border-border-subtle bg-surface p-5 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-ink">
              Khôi phục tài khoản {accountToRestore?.name ?? "khách hàng"}?
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted-text">
              Tài khoản sẽ được mở lại, khách có thể đăng nhập bằng thông tin cũ và tiếp tục dùng hồ sơ cùng lịch sử giao dịch đã lưu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-5 -mb-5 flex-row justify-end gap-2 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              disabled={restoreMutation.isPending}
              onClick={() => setAccountToRestore(null)}
              className="h-10 px-4"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={restoreMutation.isPending}
              onClick={handleRestore}
              className="h-10 px-4"
            >
              {restoreMutation.isPending ? "Đang khôi phục..." : "Khôi phục tài khoản"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
