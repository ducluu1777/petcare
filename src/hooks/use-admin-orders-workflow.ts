"use client";

import * as React from "react";
import {
  useAllOrders,
  useCancelOnlineOrder,
  useConfirmOnlineOrderTransfer,
  useOrderAdminSummary,
  useRecordOnlineOrderRefund,
  useUpdateOrderStatus,
  type Order,
} from "@/hooks/use-orders";
import type { OrderStatusFilter } from "@/components/admin/orders/order-list-filters";
import { toast } from "sonner";

const PAGE_SIZE = 20;

type OnlineOrderTransferConfirmation = {
  orderId: string;
  receivedAmount: number;
  excessRefunded: boolean;
};

export function useAdminOrdersWorkflow() {
  const [selectedStatus, setSelectedStatus] = React.useState<OrderStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const [page, setPage] = React.useState(1);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const openedFromDashboard = React.useRef<string | null>(null);
  React.useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("search");
    if (code) setSearchQuery(code);
  }, []);
  const hasOrderFilters = !!searchQuery.trim() || selectedStatus !== "ALL";

  const ordersQuery = useAllOrders({
    status: selectedStatus === "ALL" || selectedStatus === "OVERDUE" ? undefined : selectedStatus,
    overdueOnly: selectedStatus === "OVERDUE" ? true : undefined,
    search: deferredSearchQuery.trim() || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const summaryQuery = useOrderAdminSummary();
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      void ordersQuery.refetch();
      void summaryQuery.refetch();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [ordersQuery.refetch, summaryQuery.refetch]);
  const updateOrderStatus = useUpdateOrderStatus();
  const cancelOnlineOrder = useCancelOnlineOrder();
  const recordOnlineOrderRefund = useRecordOnlineOrderRefund();
  const confirmOnlineOrderTransfer = useConfirmOnlineOrderTransfer();

  const orders: Order[] = React.useMemo(
    () => Array.isArray(ordersQuery.data?.data) ? ordersQuery.data.data : [],
    [ordersQuery.data],
  );
  React.useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("open");
    if (!code || openedFromDashboard.current === code) return;
    const order = orders.find((item) => item.code === code);
    if (!order) return;
    openedFromDashboard.current = code;
    setSelectedOrder(order);
  }, [orders]);
  const totalOrders = ordersQuery.data?.meta.total ?? 0;
  const totalPages = Math.max(1, ordersQuery.data?.meta.totalPages ?? 1);
  const firstOrder = totalOrders === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastOrder = Math.min(page * PAGE_SIZE, totalOrders);

  const refreshOrders = async () => {
    await Promise.all([ordersQuery.refetch(), summaryQuery.refetch()]);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order["status"], label: string) => {
    try {
      await updateOrderStatus.mutateAsync({ id: orderId, status: newStatus });
      toast.success(`Đã cập nhật đơn hàng: ${label}`);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((previous) => previous ? { ...previous, status: newStatus } : null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cập nhật trạng thái thất bại.");
    }
  };

  const handleCancelOnlineOrder = async (orderId: string, reason: string, goodsReturned: boolean) => {
    try {
      const updatedOrder = await cancelOnlineOrder.mutateAsync({ id: orderId, reason, goodsReturned });
      setSelectedOrder(updatedOrder);
      toast.success(`Đã hủy ${updatedOrder.code}. Hàng và voucher đã được trả.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể hủy đơn hàng.");
      return false;
    }
  };

  const handleRecordOnlineOrderRefund = async (orderId: string) => {
    try {
      const updatedOrder = await recordOnlineOrderRefund.mutateAsync(orderId);
      setSelectedOrder(updatedOrder);
      toast.success(`Đã ghi nhận hoàn tiền cho ${updatedOrder.code}.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể ghi nhận khoản hoàn tiền.");
      return false;
    }
  };

  const handleConfirmOnlineOrderTransfer = async (input: OnlineOrderTransferConfirmation) => {
    try {
      const updatedOrder = await confirmOnlineOrderTransfer.mutateAsync(input);
      setSelectedOrder(updatedOrder);
      toast.success(`Đã xác nhận nhận đủ tiền cho đơn ${updatedOrder.code}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xác nhận khoản chuyển.");
    }
  };

  return {
    clearFilters: () => {
      setPage(1);
      setSearchQuery("");
      setSelectedStatus("ALL");
    },
    firstOrder,
    handleCancelOnlineOrder,
    handleConfirmOnlineOrderTransfer,
    handleRecordOnlineOrderRefund,
    handleUpdateStatus,
    hasOrderFilters,
    isError: ordersQuery.isError,
    isFetching: ordersQuery.isFetching,
    isLoading: ordersQuery.isLoading,
    isRefreshing: ordersQuery.isFetching || summaryQuery.isFetching,
    isSummaryError: summaryQuery.isError,
    isSummaryLoading: summaryQuery.isLoading,
    isUpdating: updateOrderStatus.isPending
      || cancelOnlineOrder.isPending
      || recordOnlineOrderRefund.isPending
      || confirmOnlineOrderTransfer.isPending,
    isUpdatingStatus: updateOrderStatus.isPending,
    lastOrder,
    onSearchChange: (value: string) => {
      setPage(1);
      setSearchQuery(value);
    },
    onStatusChange: (value: OrderStatusFilter) => {
      setPage(1);
      setSelectedStatus(value);
    },
    orders,
    page,
    refetch: ordersQuery.refetch,
    refreshOrders,
    searchQuery,
    selectedOrder,
    selectedStatus,
    setPage,
    setSelectedOrder,
    summary: summaryQuery.data,
    totalOrders,
    totalPages,
  };
}
