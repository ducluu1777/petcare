"use client";

import * as React from "react";
import { useAllTransactions } from "@/hooks/use-transactions";
import type { TransactionMethodFilter, TransactionSourceFilter } from "@/components/admin/transactions/transaction-list-filters";
import type { TransactionRecord, TransactionSource } from "@/lib/admin-transaction-record";
import { vietnamDateKey } from "@/lib/calendar-date-utils";

const PAGE_SIZE = 20;

const TRANSACTION_SOURCE_LABELS: Record<TransactionSource, string> = {
  BOOKING: "Lịch dịch vụ",
  ONLINE_ORDER: "Đơn online",
  IN_STORE: "Bán tại quầy",
  OTHER: "Khác",
};

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

function getSignedAmount(transaction: TransactionRecord) {
  return transaction.type === "REFUND" ? -transaction.amount : transaction.amount;
}

export function useAdminTransactionsWorkflow() {
  const { data: txData, isLoading, isError, refetch, isFetching } = useAllTransactions();
  const [selectedTx, setSelectedTx] = React.useState<TransactionRecord | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [methodFilter, setMethodFilter] = React.useState<TransactionMethodFilter>("ALL");
  const [sourceFilter, setSourceFilter] = React.useState<TransactionSourceFilter>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState(() => vietnamDateKey());
  const [dateTo, setDateTo] = React.useState(() => vietnamDateKey());
  const [page, setPage] = React.useState(1);

  const liveTransactions: TransactionRecord[] = React.useMemo(() => {
    if (!Array.isArray(txData)) return [];

    return txData.map((transaction) => {
      const isQR = transaction.paymentMethod === "BANK_TRANSFER";
      const date = new Date(transaction.createdAt);
      const timeLabel = date.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateLabel = date.toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const source: TransactionSource = transaction.booking
        ? "BOOKING"
        : transaction.order?.source === "IN_STORE"
          ? "IN_STORE"
          : transaction.order?.source === "ONLINE"
            ? "ONLINE_ORDER"
            : "OTHER";
      const bookingServiceNames = transaction.booking?.services
        ?.map(({ service }) => service?.name?.trim())
        .filter((name): name is string => Boolean(name))
        .join(", ");
      const petDescription = transaction.booking?.pet?.name
        ? `${transaction.booking.pet.name} (${transaction.booking.pet.breed || "Chưa xác định giống"})`
        : "";
      const bookingDescription = [bookingServiceNames, petDescription].filter(Boolean).join(" · ");

      return {
        id: transaction.id,
        referenceCode: transaction.externalId || `TX-${transaction.id.slice(0, 6).toUpperCase()}`,
        relatedCode: transaction.booking?.code || transaction.order?.code || `GD ${transaction.id.slice(0, 6).toUpperCase()}`,
        source,
        sourceLabel: TRANSACTION_SOURCE_LABELS[source],
        customerName: transaction.booking?.customer?.name
          || transaction.order?.customer?.name
          || (transaction.order?.source === "IN_STORE" ? "Khách lẻ" : "Khách hàng chưa cập nhật tên"),
        contentDescription: bookingDescription || (transaction.order?.items.length
            ? transaction.order.items.map((item) => `${item.product.name} × ${item.quantity}`).join(", ")
            : "Không có nội dung bổ sung"),
        amount: Number(transaction.amount || 0),
        receivedAmount: transaction.receivedAmount,
        note: transaction.note,
        confirmedByName: transaction.confirmedBy?.name ?? null,
        type: transaction.type,
        method: isQR ? "VIETQR" : "CASH",
        proofUrl: transaction.proofUrl,
        transactedAt: `${timeLabel}, ${dateLabel}`,
        createdAt: transaction.createdAt,
        recordSource: transaction.type === "DEPOSIT"
          ? "Đặt cọc (lịch sử)"
          : transaction.type === "REFUND"
            ? "Ghi nhận khoản hoàn tiền"
          : transaction.order?.source === "IN_STORE"
            ? "Bán sản phẩm tại quầy"
            : isQR
              ? "Nhân viên xác nhận chuyển khoản"
              : "Ghi nhận tại quầy",
      };
    });
  }, [txData]);

  const hasInvalidDateRange = !!dateFrom && !!dateTo && dateFrom > dateTo;
  const hasTransactionFilters = !!searchQuery.trim()
    || methodFilter !== "ALL"
    || sourceFilter !== "ALL"
    || !!dateFrom
    || !!dateTo;

  const transactionsInPeriod = React.useMemo(() => {
    if (hasInvalidDateRange) return [];

    return liveTransactions.filter((transaction) => {
      const dateKey = vietnamDateKey(new Date(transaction.createdAt));
      if (dateFrom && dateKey < dateFrom) return false;
      if (dateTo && dateKey > dateTo) return false;
      return true;
    });
  }, [dateFrom, dateTo, hasInvalidDateRange, liveTransactions]);

  const filteredTransactions = React.useMemo(() => transactionsInPeriod.filter((transaction) => {
    if (methodFilter !== "ALL" && transaction.method !== methodFilter) return false;
    if (sourceFilter !== "ALL" && transaction.source !== sourceFilter) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return transaction.referenceCode.toLowerCase().includes(query)
        || transaction.relatedCode.toLowerCase().includes(query)
        || transaction.customerName.toLowerCase().includes(query)
        || transaction.contentDescription.toLowerCase().includes(query)
        || transaction.sourceLabel.toLowerCase().includes(query)
        || transaction.recordSource.toLowerCase().includes(query);
    }

    return true;
  }), [transactionsInPeriod, methodFilter, sourceFilter, searchQuery]);

  const sourceCounts = React.useMemo<Record<TransactionSourceFilter, number>>(() => ({
    ALL: transactionsInPeriod.length,
    BOOKING: transactionsInPeriod.filter((transaction) => transaction.source === "BOOKING").length,
    ONLINE_ORDER: transactionsInPeriod.filter((transaction) => transaction.source === "ONLINE_ORDER").length,
    IN_STORE: transactionsInPeriod.filter((transaction) => transaction.source === "IN_STORE").length,
    OTHER: transactionsInPeriod.filter((transaction) => transaction.source === "OTHER").length,
  }), [transactionsInPeriod]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const visibleTransactions = filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstTransaction = filteredTransactions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastTransaction = Math.min(page * PAGE_SIZE, filteredTransactions.length);

  const totalRevenue = transactionsInPeriod.reduce((sum, transaction) => sum + getSignedAmount(transaction), 0);
  const qrTransactions = transactionsInPeriod.filter((transaction) => transaction.method === "VIETQR");
  const cashTransactions = transactionsInPeriod.filter((transaction) => transaction.method === "CASH");
  const qrRevenue = qrTransactions.reduce((sum, transaction) => sum + getSignedAmount(transaction), 0);
  const cashRevenue = cashTransactions.reduce((sum, transaction) => sum + getSignedAmount(transaction), 0);
  const qrCount = qrTransactions.length;
  const cashCount = cashTransactions.length;
  const periodLabel = dateFrom && dateTo
    ? dateFrom === dateTo
      ? formatDateKey(dateFrom)
      : `${formatDateKey(dateFrom)} – ${formatDateKey(dateTo)}`
    : dateFrom
      ? `Từ ${formatDateKey(dateFrom)}`
      : dateTo
        ? `Đến ${formatDateKey(dateTo)}`
        : "Toàn bộ lịch sử";

  const handleOpenDetail = (transaction: TransactionRecord) => {
    setSelectedTx(transaction);
    setIsSheetOpen(true);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchQuery("");
    setMethodFilter("ALL");
    setSourceFilter("ALL");
    setDateFrom("");
    setDateTo("");
  };

  return {
    cashCount,
    cashRevenue,
    clearFilters,
    dateFrom,
    dateTo,
    firstTransaction,
    filteredTransactions,
    handleOpenDetail,
    hasInvalidDateRange,
    hasTransactionFilters,
    isError,
    isFetching,
    isLoading,
    isSheetOpen,
    lastTransaction,
    methodFilter,
    onDateFromChange: (value: string) => { setPage(1); setDateFrom(value); },
    onDateToChange: (value: string) => { setPage(1); setDateTo(value); },
    onMethodChange: (value: TransactionMethodFilter) => { setPage(1); setMethodFilter(value); },
    onSearchChange: (value: string) => { setPage(1); setSearchQuery(value); },
    onSheetOpenChange: setIsSheetOpen,
    onSourceChange: (value: TransactionSourceFilter) => { setPage(1); setSourceFilter(value); },
    page,
    periodLabel,
    qrCount,
    qrRevenue,
    refetch,
    searchQuery,
    selectedTx,
    setPage,
    sourceCounts,
    sourceFilter,
    totalPages,
    totalRevenue,
    transactionCount: transactionsInPeriod.length,
    visibleTransactions,
  };
}
