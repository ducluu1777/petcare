"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useAllBookings, useTodayBookings } from "@/hooks/use-bookings";
import { useTransactionSummary, useTransactionTodaySummary } from "@/hooks/use-transactions";
import { useAdminInventorySummary } from "@/hooks/use-products";
import { useOrderAdminSummary, type Order } from "@/hooks/use-orders";
import { addCalendarDays, calendarDateFromKey, calendarDateKey, vietnamDateKey } from "@/lib/calendar-date-utils";
import { summarizeBookingOperationalStatuses, summarizeBookings } from "./dashboard-metrics";

export type DashboardSepayEvent = {
  id: string;
  paymentCode: string | null;
  amount: number;
  reason: string | null;
  status: string;
  referenceCode: string | null;
  createdAt: string;
  order: { id: string; code: string } | null;
  booking: { id: string; code: string } | null;
};

type SepayDashboard = {
  configured: boolean;
  lastReceivedAt: string | null;
  reviewCount: number;
  reviews: DashboardSepayEvent[];
  reviewPage: number;
  reviewPageSize: number;
  recentConfirmed: DashboardSepayEvent[];
};

export type DashboardAiRequest = {
  requestId: string;
  source: string;
  model: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  reason: string | null;
  status: number | null;
  createdAt: string;
};

type AiDashboard = {
  model: string;
  keyConfigured: boolean;
  dailyRequestLimit: number;
  modelRequestsToday: number;
  remainingModelRequests: number;
  fallbackRequestsToday: number;
  providerErrorsToday: number;
  providerTokenUsageToday: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null } | null;
  issueCount: number;
  issues: DashboardAiRequest[];
  issuePage: number;
  issuePageSize: number;
  recentSuccess: DashboardAiRequest[];
};

type OrderDashboardQueue = {
  total: number;
  page: number;
  pageSize: number;
  orders: Order[];
};

export type DashboardContactRequest = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  topic: string;
  petInfo: string | null;
  message: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
};

type ContactRequestsDashboard = {
  openCount: number;
  items: DashboardContactRequest[];
};

export function useAdminDashboardWorkflow() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const enabled = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");
  const [pickupPage, setPickupPage] = React.useState(1);
  const [orderPage, setOrderPage] = React.useState(1);
  const [sepayPage, setSepayPage] = React.useState(1);
  const [aiPage, setAiPage] = React.useState(1);
  const bookingsQuery = useTodayBookings();
  const readyForPickupQuery = useAllBookings({
    statusFilter: "READY_FOR_PICKUP",
    type: "SPA",
    page: 1,
    limit: 1,
  });
  const transactionsQuery = useTransactionTodaySummary();
  const trendQuery = useTransactionSummary(7);
  const inventoryQuery = useAdminInventorySummary();
  const ordersQuery = useOrderAdminSummary();
  const pickupListQuery = useAllBookings({ statusFilter: "READY_FOR_PICKUP", type: "SPA", page: pickupPage, limit: 20 });
  const orderQueueQuery = useQuery({
    queryKey: ["dashboard", "order-queue", orderPage],
    queryFn: () => apiClient.get<OrderDashboardQueue>(`/orders/admin/dashboard-queue?page=${orderPage}`),
    enabled,
    refetchInterval: 30_000,
  });
  const sepayQuery = useQuery({
    queryKey: ["dashboard", "sepay", sepayPage],
    queryFn: () => apiClient.get<SepayDashboard>(`/payment/sepay/review/dashboard?page=${sepayPage}`),
    enabled,
    refetchInterval: 30_000,
  });
  const aiQuery = useQuery({
    queryKey: ["dashboard", "ai", aiPage],
    queryFn: () => apiClient.get<AiDashboard>(`/ai/admin/dashboard?page=${aiPage}`),
    enabled,
    refetchInterval: 30_000,
  });
  const contactRequestsQuery = useQuery({
    queryKey: ["dashboard", "contact-requests"],
    queryFn: () => apiClient.get<ContactRequestsDashboard>("/contact-requests/admin/dashboard"),
    enabled,
    refetchInterval: 30_000,
  });
  const refreshBookings = bookingsQuery.refetch;
  const refreshReadyForPickup = readyForPickupQuery.refetch;
  const refreshTransactions = transactionsQuery.refetch;
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [now, setNow] = React.useState(() => new Date());

  const todayKey = vietnamDateKey(now);
  const tomorrowKey = calendarDateKey(addCalendarDays(calendarDateFromKey(todayKey), 1));
  const lastQueryDate = React.useRef(todayKey);
  const todaySpaBookings = (bookingsQuery.data ?? []);
  const bookingSummary = summarizeBookings(todaySpaBookings);
  const operationalBookingSummary = summarizeBookingOperationalStatuses(todaySpaBookings);
  const pendingOrders = ordersQuery.data?.pendingOrders ?? [];
  const productsToRestock = inventoryQuery.data?.restockProducts ?? [];

  const refresh = async () => {
    const results = await Promise.all([
      refreshBookings(),
      refreshReadyForPickup(),
      refreshTransactions(),
      trendQuery.refetch(),
      inventoryQuery.refetch(),
      ordersQuery.refetch(),
      pickupListQuery.refetch(),
      orderQueueQuery.refetch(),
      sepayQuery.refetch(),
      aiQuery.refetch(),
      contactRequestsQuery.refetch(),
    ]);
    if (results.every((result) => result.isSuccess)) setLastUpdated(new Date());
  };

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (lastQueryDate.current === todayKey) return;
    lastQueryDate.current = todayKey;
    void Promise.all([refreshBookings(), refreshTransactions()]);
  }, [todayKey, refreshBookings, refreshTransactions]);

  return {
    bookingSummary,
    bookings: todaySpaBookings,
    bookingsError: bookingsQuery.isError,
    bookingsFetching: bookingsQuery.isFetching,
    bookingsLoading: bookingsQuery.isLoading,
    bookingsUpdatedAt: bookingsQuery.dataUpdatedAt,
    pickupPage,
    setPickupPage,
    pickupList: pickupListQuery.data?.data ?? [],
    pickupTotal: pickupListQuery.data?.meta.total ?? 0,
    pickupListLoading: pickupListQuery.isLoading,
    pickupListError: pickupListQuery.isError,
    pickupListFetching: pickupListQuery.isFetching,
    pickupUpdatedAt: pickupListQuery.dataUpdatedAt,
    readyForPickupCount: readyForPickupQuery.data?.meta.total ?? 0,
    readyForPickupError: readyForPickupQuery.isError,
    readyForPickupFetching: readyForPickupQuery.isFetching,
    readyForPickupLoading: readyForPickupQuery.isLoading,
    lastUpdated,
    lowStockCount: inventoryQuery.data?.lowStock ?? 0,
    now,
    operationalBookingSummary,
    orderSummary: ordersQuery.data,
    orderPage,
    setOrderPage,
    orderQueue: orderQueueQuery.data?.orders ?? [],
    orderQueueTotal: orderQueueQuery.data?.total ?? 0,
    orderQueueLoading: orderQueueQuery.isLoading,
    orderQueueError: orderQueueQuery.isError,
    orderQueueFetching: orderQueueQuery.isFetching,
    orderQueueUpdatedAt: orderQueueQuery.dataUpdatedAt,
    sepayPage,
    setSepayPage,
    sepay: sepayQuery.data,
    sepayLoading: sepayQuery.isLoading,
    sepayError: sepayQuery.isError,
    sepayFetching: sepayQuery.isFetching,
    sepayUpdatedAt: sepayQuery.dataUpdatedAt,
    aiPage,
    setAiPage,
    ai: aiQuery.data,
    aiLoading: aiQuery.isLoading,
    aiError: aiQuery.isError,
    aiFetching: aiQuery.isFetching,
    aiUpdatedAt: aiQuery.dataUpdatedAt,
    contactRequests: contactRequestsQuery.data,
    contactRequestsLoading: contactRequestsQuery.isLoading,
    contactRequestsError: contactRequestsQuery.isError,
    contactRequestsFetching: contactRequestsQuery.isFetching,
    contactRequestsUpdatedAt: contactRequestsQuery.dataUpdatedAt,
    trend: trendQuery.data ?? [],
    trendLoading: trendQuery.isLoading,
    trendError: trendQuery.isError,
    trendFetching: trendQuery.isFetching,
    trendUpdatedAt: trendQuery.dataUpdatedAt,
    ordersError: ordersQuery.isError,
    ordersFetching: ordersQuery.isFetching,
    ordersLoading: ordersQuery.isLoading,
    outOfStockCount: inventoryQuery.data?.outOfStock ?? 0,
    pendingOrders,
    pendingOrderCount: ordersQuery.data?.pending ?? 0,
    productsError: inventoryQuery.isError,
    productsFetching: inventoryQuery.isFetching,
    productsLoading: inventoryQuery.isLoading,
    productsUpdatedAt: inventoryQuery.dataUpdatedAt,
    productsToRestock,
    refresh,
    refreshBookings,
    refreshReadyForPickup,
    refreshOrders: ordersQuery.refetch,
    refreshProducts: inventoryQuery.refetch,
    refreshTransactions,
    todayBookingQuery: `dateFrom=${todayKey}&dateTo=${tomorrowKey}`,
    transactionsError: transactionsQuery.isError,
    transactionsFetching: transactionsQuery.isFetching,
    transactionsLoading: transactionsQuery.isLoading,
    transactionsUpdatedAt: transactionsQuery.dataUpdatedAt,
    transactionSummary: transactionsQuery.data,
  };
}
