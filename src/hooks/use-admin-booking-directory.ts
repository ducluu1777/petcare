"use client"

import * as React from "react"
import { BOOKING_STATUS_FILTERS, type BookingStatusFilter } from "@/components/admin/bookings/booking-filters"
import type { BookingViewLayout } from "@/components/admin/bookings/booking-view-switcher"
import { mapBookingItemToRecord, type BookingRecord } from "@/lib/admin-booking-record"
import { useAllBookings } from "@/hooks/use-bookings"

type SearchParamsReader = {
  get: (name: string) => string | null
}

type UseAdminBookingDirectoryOptions = {
  searchParams: SearchParamsReader
  pageSize: number
}

export function useAdminBookingDirectory({ searchParams, pageSize }: UseAdminBookingDirectoryOptions) {
  const initialQuery = searchParams.get("q") ?? ""
  const initialStatus = searchParams.get("statusFilter") ?? "ALL"
  const initialStatusFilter = BOOKING_STATUS_FILTERS.find((filter) => filter === initialStatus) ?? "ALL"
  const initialDateFrom = searchParams.get("dateFrom")
  const initialDateTo = searchParams.get("dateTo")
  const [bookingsPage, setBookingsPage] = React.useState(1)
  const [searchQuery, setSearchQuery] = React.useState(initialQuery)
  const [searchTerm, setSearchTerm] = React.useState(initialQuery.trim())
  const [statusFilter, setStatusFilter] = React.useState<BookingStatusFilter>(initialStatusFilter)
  const [tableDateRange, setTableDateRange] = React.useState<{ from: string; to: string } | null>(() =>
    initialDateFrom &&
    initialDateTo &&
    /^\d{4}-\d{2}-\d{2}$/.test(initialDateFrom) &&
    /^\d{4}-\d{2}-\d{2}$/.test(initialDateTo) &&
    initialDateFrom < initialDateTo
      ? { from: initialDateFrom, to: initialDateTo }
      : null,
  )
  const [viewLayout, setViewLayout] = React.useState<BookingViewLayout>("TABLE")
  const [calendarRange, setCalendarRange] = React.useState<{ from: string; to: string } | null>(null)

  const handleCalendarRangeChange = React.useCallback((range: { from: string; to: string }) => {
    setCalendarRange((current) => current?.from === range.from && current?.to === range.to ? current : range)
  }, [])

  React.useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchQuery.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const {
    data: bookingsData,
    isLoading,
    isFetching,
    isError: bookingsError,
    refetch,
  } = useAllBookings({
    page: bookingsPage,
    limit: viewLayout === "CALENDAR" ? 100 : pageSize,
    q: searchTerm || undefined,
    statusFilter: statusFilter === "ALL" ? undefined : statusFilter,
    type: "SPA",
    dateFrom: viewLayout === "CALENDAR" ? calendarRange?.from : tableDateRange?.from,
    dateTo: viewLayout === "CALENDAR" ? calendarRange?.to : tableDateRange?.to,
    enabled: viewLayout === "TABLE" || calendarRange !== null,
  })

  const liveBookings: BookingRecord[] = React.useMemo(() => {
    return (bookingsData?.data ?? [])
      .map(mapBookingItemToRecord)
  }, [bookingsData])

  const bookingsMeta = React.useMemo(() => ({
    total: bookingsData?.meta.total ?? liveBookings.length,
    totalPages: Math.max(1, bookingsData?.meta.totalPages ?? 1),
  }), [bookingsData, liveBookings.length])

  const [bookingOverride, setBookingOverride] = React.useState<{
    source: BookingRecord[]
    items: BookingRecord[]
  } | null>(null)
  const bookings = bookingOverride?.source === liveBookings ? bookingOverride.items : liveBookings

  const setBookings: React.Dispatch<React.SetStateAction<BookingRecord[]>> = React.useCallback((action) => {
    setBookingOverride((current) => {
      const currentItems = current?.source === liveBookings ? current.items : liveBookings
      const nextItems = typeof action === "function" ? action(currentItems) : action
      return { source: liveBookings, items: nextItems }
    })
  }, [liveBookings])

  const handleViewLayoutChange = (layout: BookingViewLayout) => {
    setViewLayout(layout)
    setBookingsPage(1)
    if (layout === "CALENDAR") {
      setSearchQuery("")
      setStatusFilter("ALL")
      setTableDateRange(null)
      setCalendarRange(null)
    }
  }

  return {
    bookings,
    bookingsMeta,
    bookingsPage,
    bookingsError,
    calendarRange,
    handleCalendarRangeChange,
    handleViewLayoutChange,
    isFetching,
    isLoading,
    refetch,
    searchQuery,
    setBookings,
    setBookingsPage,
    setSearchQuery,
    setStatusFilter,
    setTableDateRange,
    setViewLayout,
    statusFilter,
    tableDateRange,
    viewLayout,
  }
}
