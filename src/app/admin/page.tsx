"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, ArrowUpRight, Bot, CalendarClock, MessageSquareText, Truck, UserRoundCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { getAdminBookingStatusLabel } from "@/lib/admin-booking-status";
import { getProductCategoryLabel } from "@/lib/product-category";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { vietnamDateKey } from "@/lib/calendar-date-utils";
import type { BookingItem } from "@/hooks/use-bookings";
import type { Order } from "@/hooks/use-orders";
import { useAdminDashboardWorkflow, type DashboardAiRequest, type DashboardSepayEvent } from "./use-admin-dashboard-workflow";
import { getContactRequestAttentionCard } from "./dashboard-metrics";
import { getDisplayLabel } from "@/lib/domain-labels";

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const sourceUpdated = (value: number) => value ? `Cập nhật ${new Date(value).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })}` : "Chưa cập nhật";
const dateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const bookingHref = (code: string) => `/admin/bookings?q=${encodeURIComponent(code)}&open=${encodeURIComponent(code)}`;
const orderHref = (code: string) => `/admin/orders?search=${encodeURIComponent(code)}&open=${encodeURIComponent(code)}`;
const activeStatuses = new Set(["BOOKED", "ARRIVED", "IN_SERVICE", "READY_FOR_PICKUP", "PENDING", "CONFIRMED", "IN_PROGRESS"]);
const orderLabels: Record<Order["status"], string> = { PENDING: "Chờ chuẩn bị", PROCESSING: "Đang chuẩn bị", READY: "Sẵn sàng", IN_DELIVERY: "Đang giao", DELIVERY_FAILED: "Giao thất bại", COMPLETED: "Hoàn tất", CANCELLED: "Đã hủy" };

function bookingStart(booking: BookingItem, todayKey: string): number {
  if (booking.startAt) return new Date(booking.startAt).getTime();
  return booking.timeSlot?.slotTime ? new Date(`${todayKey}T${booking.timeSlot.slotTime}+07:00`).getTime() : Number.MAX_SAFE_INTEGER;
}
function isBooked(booking: BookingItem) { return ["BOOKED", "PENDING", "CONFIRMED"].includes(booking.statusV2 || booking.status); }
function Panel({ title, detail, href, children }: { title: string; detail?: string; href?: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4"><div className="min-w-0"><h2 className="text-base font-bold text-ink">{title}</h2>{detail && <p className="mt-1 text-sm text-muted-text">{detail}</p>}</div>{href && <Link href={href} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-admin-primary hover:underline">Xem tất cả <ArrowUpRight className="size-4" /></Link>}</div>
    {children}
  </section>;
}
function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  if (total <= 20) return null;
  const pages = Math.ceil(total / 20);
  return <div className="mt-4 flex items-center justify-between gap-2 border-t border-border-subtle pt-3 text-sm"><span className="text-muted-text">Trang {page}/{pages} · {total} mục</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-border-subtle px-3 py-1.5 disabled:opacity-40">Trước</button><button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-lg border border-border-subtle px-3 py-1.5 disabled:opacity-40">Sau</button></div></div>;
}
function SepayRow({ event, issue }: { event: DashboardSepayEvent; issue: boolean }) {
  const code = event.order?.code ?? event.booking?.code ?? event.paymentCode ?? "Chưa ghép";
  const href = issue ? `/admin/orders?reviewId=${encodeURIComponent(event.id)}#sepay-review` : event.order ? orderHref(event.order.code) : event.booking ? bookingHref(event.booking.code) : "/admin/orders";
  return <Link href={href} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border-subtle py-3 last:border-0 hover:text-admin-primary"><div className="min-w-0"><p className="break-all text-sm font-semibold">{code} <span className="font-normal text-muted-text">· #{event.id}</span></p><p className="text-xs text-muted-text">{issue ? getDisplayLabel("sepayReason", event.reason) : "Đã xác nhận"} · {dateTime(event.createdAt)}</p></div><strong className="text-sm tabular-nums">{money(event.amount)}</strong></Link>;
}
function AiRow({ request, issue }: { request: DashboardAiRequest; issue: boolean }) {
  return <Link href={`/admin/ai?requestId=${encodeURIComponent(request.requestId)}#ai-usage`} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border-subtle py-3 last:border-0 hover:text-admin-primary"><div className="min-w-0"><p className="break-all text-sm font-semibold">{issue ? getDisplayLabel("aiReason", request.reason) : "AI đã trả lời"}</p><p className="text-xs text-muted-text">{dateTime(request.createdAt)} · {request.requestId} · {request.durationMs} ms</p></div><span className="text-xs tabular-nums text-muted-text">{request.status ? `HTTP ${request.status}` : request.totalTokens == null ? "Chưa có token" : `${request.totalTokens} token`}</span></Link>;
}

export default function AdminDashboardPage() {
  const w = useAdminDashboardWorkflow();
  const todayKey = vietnamDateKey(w.now);
  const nowMs = w.now.getTime();
  const agenda = w.bookings.filter((booking) => booking.type === "SPA" && activeStatuses.has(booking.statusV2 || booking.status)).sort((a, b) => {
    const aStart = bookingStart(a, todayKey), bStart = bookingStart(b, todayKey);
    return Number(isBooked(b) && bStart < nowMs) - Number(isBooked(a) && aStart < nowMs) || aStart - bStart;
  });
  const lateCount = agenda.filter((booking) => isBooked(booking) && bookingStart(booking, todayKey) < nowMs).length;
  const maxTrend = Math.max(1, ...w.trend.map((day) => Math.max(0, day.revenue)));
  const refreshing = [w.bookingsFetching, w.readyForPickupFetching, w.pickupListFetching, w.ordersFetching, w.orderQueueFetching, w.productsFetching, w.transactionsFetching, w.trendFetching, w.sepayFetching, w.aiFetching, w.contactRequestsFetching].some(Boolean);
  const contactRequestAttention = getContactRequestAttentionCard({
    openCount: w.contactRequests?.openCount,
    isLoading: w.contactRequestsLoading,
    isError: w.contactRequestsError,
  });
  return <AdminPageShell>
    <AdminPageHeader section="Điều hành ca" subsection={new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(w.now)} title="Hôm nay cần làm gì?" description="Lịch hẹn, khách chờ nhận, đơn hàng và các khoản cần đối soát tại một nơi." onRefresh={w.refresh} isRefreshing={refreshing} actions={w.lastUpdated ? <span className="text-xs text-muted-text">Đã làm mới {w.lastUpdated.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })}</span> : null} />
    <section aria-label="Việc cần chú ý" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        { icon: CalendarClock, label: "Lịch quá giờ chưa đến", value: w.bookingsLoading ? "…" : w.bookingsError ? "—" : lateCount, href: `/admin/bookings?${w.todayBookingQuery}`, attention: lateCount > 0 },
        { icon: UserRoundCheck, label: "Bé chờ khách nhận", value: w.readyForPickupLoading ? "…" : w.readyForPickupError ? "—" : w.readyForPickupCount, href: "/admin/bookings?statusFilter=READY_FOR_PICKUP", attention: w.readyForPickupCount > 0 },
        { icon: Truck, label: "Đơn cần xử lý", value: w.orderQueueLoading ? "…" : w.orderQueueError ? "—" : w.orderQueueTotal, href: "/admin/orders", attention: w.orderQueueTotal > 0 },
        { icon: AlertCircle, label: "SePay cần đối chiếu", value: w.sepayLoading ? "…" : w.sepayError ? "—" : w.sepay?.reviewCount ?? 0, href: "/admin/orders", attention: (w.sepay?.reviewCount ?? 0) > 0 },
        { icon: MessageSquareText, ...contactRequestAttention, href: "/admin/contact-requests" },
      ].map(({ icon: Icon, label, value, href, attention }) => <Link key={label} href={href} className={`flex min-w-0 items-start gap-3 rounded-2xl border p-4 transition-colors hover:border-admin-primary ${attention ? "border-amber-200 bg-amber-50/60" : "border-border-subtle bg-surface"}`}><span className="rounded-xl bg-white p-2 text-admin-primary"><Icon className="size-5" /></span><span className="min-w-0"><span className="block text-sm text-muted-text">{label}</span><strong className="mt-1 block text-2xl tabular-nums text-ink">{value}</strong></span></Link>)}
    </section>
    <Panel title="Lịch Spa chưa xong hôm nay" detail={`${agenda.length} lịch cần theo dõi · ${lateCount} lịch quá giờ chưa đến. Quá 20 phút chỉ nhắc xem xét; nhân viên xác nhận Không đến trong chi tiết. · ${sourceUpdated(w.bookingsUpdatedAt)}`} href={`/admin/bookings?${w.todayBookingQuery}`}>
      {w.bookingsLoading ? <AdminDataState variant="loading" title="Đang tải lịch…" /> : w.bookingsError ? <AdminDataState variant="error" title="Không tải được lịch hôm nay." onRetry={w.refreshBookings} /> : agenda.length === 0 ? <AdminDataState variant="empty" title="Không còn lịch Spa cần xử lý hôm nay." /> : <div className="max-h-[34rem] divide-y divide-border-subtle overflow-y-auto pr-1">{agenda.map((booking) => {
        const start = bookingStart(booking, todayKey), late = isBooked(booking) && start < nowMs, noShowEligible = late && nowMs - start >= 20 * 60_000;
        return <Link key={booking.id} href={bookingHref(booking.code)} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3.5 hover:text-admin-primary"><div className="flex min-w-0 items-start gap-3"><span className="w-14 shrink-0 text-sm font-bold tabular-nums">{Number.isFinite(start) && start !== Number.MAX_SAFE_INTEGER ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(start)) : "—"}</span><div className="min-w-0"><p className="break-words text-sm font-semibold">{booking.pet?.name ?? "Thú cưng"} <span className="font-normal text-muted-text">· {booking.customer?.name ?? "Khách hàng"}</span></p><p className="text-xs text-muted-text">{booking.code} · {booking.services?.map((item) => item.service?.name).filter(Boolean).join(", ") || "Dịch vụ Spa"}</p></div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${late ? "bg-amber-100 text-amber-900" : "bg-admin-muted-surface text-admin-text-emphasis"}`}>{noShowEligible ? "Quá 20 phút · xem xét Không đến" : late ? "Quá giờ hẹn" : getAdminBookingStatusLabel(booking.statusV2 || booking.status)}</span></Link>;
      })}</div>}
    </Panel>
    <Panel title="Yêu cầu liên hệ cần phản hồi" detail={`Mới và đang xử lý · ${sourceUpdated(w.contactRequestsUpdatedAt)}`} href="/admin/contact-requests">
      {w.contactRequestsLoading ? <AdminDataState variant="loading" title="Đang tải yêu cầu liên hệ…" /> : w.contactRequestsError ? <AdminDataState variant="error" title="Không tải được yêu cầu liên hệ." /> : !w.contactRequests?.items.length ? <AdminDataState variant="empty" title="Không có yêu cầu đang chờ phản hồi." /> : <div className="max-h-80 divide-y divide-border-subtle overflow-y-auto">{w.contactRequests.items.map((request) => <Link key={request.id} href="/admin/contact-requests" className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3.5 hover:text-admin-primary"><span className="min-w-0"><strong className="block break-words text-sm">{request.fullName} · {request.phone}</strong><span className="mt-0.5 block text-xs text-muted-text">{getDisplayLabel("contactTopic", request.topic)} · {getDisplayLabel("contactStatus", request.status)} · {dateTime(request.createdAt)}</span><span className="mt-1 block break-words text-sm text-muted-text">{request.message}</span></span><ArrowUpRight className="size-4 shrink-0" /></Link>)}</div>}
    </Panel>
    <section className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Panel title="Bé chờ khách nhận" detail={`Gồm cả lịch từ ngày trước · ${sourceUpdated(w.pickupUpdatedAt)}`} href="/admin/bookings?statusFilter=READY_FOR_PICKUP">
        {w.pickupListLoading ? <AdminDataState variant="loading" title="Đang tải danh sách…" /> : w.pickupListError ? <AdminDataState variant="error" title="Không tải được danh sách chờ nhận." /> : w.pickupTotal === 0 ? <AdminDataState variant="empty" title="Không có bé chờ nhận." /> : <><div className="max-h-96 divide-y divide-border-subtle overflow-y-auto">{w.pickupList.map((booking) => <Link key={booking.id} href={bookingHref(booking.code)} className="flex min-w-0 items-center justify-between gap-3 py-3 hover:text-admin-primary"><span className="min-w-0"><strong className="block truncate text-sm">{booking.pet?.name ?? "Thú cưng"} · {booking.customer?.name ?? "Khách hàng"}</strong><small className="text-muted-text">{booking.code} · {booking.startAt ? dateTime(booking.startAt) : "Chờ bàn giao"}</small></span><ArrowUpRight className="size-4 shrink-0" /></Link>)}</div><Pager page={w.pickupPage} total={w.pickupTotal} onChange={w.setPickupPage} /></>}
      </Panel>
      <Panel title="Đơn hàng cần xử lý" detail={`Đã thanh toán cần chuẩn bị, nhận hoặc giao; đơn quá hạn hiển thị riêng · ${sourceUpdated(w.orderQueueUpdatedAt)}`} href="/admin/orders">
        {w.orderQueueLoading ? <AdminDataState variant="loading" title="Đang tải đơn…" /> : w.orderQueueError ? <AdminDataState variant="error" title="Không tải được đơn hàng." /> : w.orderQueueTotal === 0 ? <AdminDataState variant="empty" title="Không có đơn cần xử lý." /> : <><div className="max-h-96 divide-y divide-border-subtle overflow-y-auto">{w.orderQueue.map((order) => <Link key={order.id} href={orderHref(order.code)} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3 hover:text-admin-primary"><span className="min-w-0"><strong className="block truncate text-sm">Đơn {order.code} · {order.customer?.name ?? order.contactName ?? "Khách hàng"}</strong><small className="text-muted-text">{order.fulfillmentMethod === "DELIVERY" ? "Giao hàng" : "Nhận tại cửa hàng"} · {dateTime(order.createdAt)}</small></span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${order.isPaymentOverdue || order.status === "DELIVERY_FAILED" ? "bg-amber-100 text-amber-900" : "bg-admin-muted-surface text-admin-text-emphasis"}`}>{order.isPaymentOverdue ? "Quá hạn thanh toán" : orderLabels[order.status]}</span></Link>)}</div><Pager page={w.orderPage} total={w.orderQueueTotal} onChange={w.setOrderPage} /></>}
      </Panel>
    </section>
    <section className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Panel title="SePay · đối soát" detail={`Cấu hình và giao dịch đã ghi nhận trong PetCare · ${sourceUpdated(w.sepayUpdatedAt)}`} href="/admin/orders">
        {w.sepayLoading ? <AdminDataState variant="loading" title="Đang tải SePay…" /> : w.sepayError ? <AdminDataState variant="error" title="Không tải được dữ liệu SePay." /> : w.sepay && <><div className="grid gap-2 rounded-xl bg-admin-muted-surface p-3 text-sm sm:grid-cols-2"><span>{w.sepay.configured ? "Đã cấu hình nhận webhook" : "Chưa đủ cấu hình nhận webhook"}</span><span>Giao dịch webhook ghi nhận gần nhất: {w.sepay.lastReceivedAt ? dateTime(w.sepay.lastReceivedAt) : "Chưa ghi nhận"}</span></div><h3 className="mt-4 font-semibold text-ink">Cần đối chiếu ({w.sepay.reviewCount})</h3>{w.sepay.reviewCount === 0 ? <p className="py-3 text-sm text-muted-text">Không có giao dịch chờ đối chiếu.</p> : <div className="max-h-64 divide-y divide-border-subtle overflow-y-auto">{w.sepay.reviews.map((event) => <SepayRow key={event.id} event={event} issue />)}</div>}<Pager page={w.sepayPage} total={w.sepay.reviewCount} onChange={w.setSepayPage} /><h3 className="mt-5 font-semibold text-ink">10 giao dịch xác nhận gần nhất</h3>{w.sepay.recentConfirmed.length === 0 ? <p className="py-3 text-sm text-muted-text">Chưa có giao dịch được webhook xác nhận.</p> : <div className="max-h-64 divide-y divide-border-subtle overflow-y-auto">{w.sepay.recentConfirmed.map((event) => <SepayRow key={event.id} event={event} issue={false} />)}</div>}</>}
      </Panel>
      <Panel title="Trợ lý AI · mức sử dụng" detail={`Hạn mức nội bộ và các yêu cầu model đã ghi nhận · ${sourceUpdated(w.aiUpdatedAt)}`} href="/admin/ai">
        {w.aiLoading ? <AdminDataState variant="loading" title="Đang tải AI…" /> : w.aiError ? <AdminDataState variant="error" title="Không tải được dữ liệu AI." /> : w.ai && <><div className="space-y-1 rounded-xl bg-admin-muted-surface p-3 text-sm"><p><Bot className="mr-1 inline size-4" /> {w.ai.model} · {w.ai.keyConfigured ? "Đã cấu hình khóa" : "Chưa cấu hình khóa"}</p><p>{w.ai.modelRequestsToday}/{w.ai.dailyRequestLimit} lượt gọi AI hôm nay · còn {w.ai.remainingModelRequests}</p><p>{w.ai.fallbackRequestsToday} phản hồi dự phòng · {w.ai.providerErrorsToday} lỗi dịch vụ AI · {w.ai.providerTokenUsageToday?.totalTokens ?? "Chưa có"} token đã ghi nhận</p></div><h3 className="mt-4 font-semibold text-ink">Lỗi và phản hồi dự phòng ({w.ai.issueCount})</h3>{w.ai.issueCount === 0 ? <p className="py-3 text-sm text-muted-text">Không có yêu cầu cần xem lại.</p> : <div className="max-h-64 divide-y divide-border-subtle overflow-y-auto">{w.ai.issues.map((request) => <AiRow key={request.requestId} request={request} issue />)}</div>}<Pager page={w.aiPage} total={w.ai.issueCount} onChange={w.setAiPage} /><h3 className="mt-5 font-semibold text-ink">10 phản hồi AI thành công gần nhất</h3>{w.ai.recentSuccess.length === 0 ? <p className="py-3 text-sm text-muted-text">Chưa có phản hồi AI thành công.</p> : <div className="max-h-64 divide-y divide-border-subtle overflow-y-auto">{w.ai.recentSuccess.map((request) => <AiRow key={request.requestId} request={request} issue={false} />)}</div>}</>}
      </Panel>
    </section>
    <section className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Panel title="Tồn kho cần bổ sung" detail={`Tồn khả dụng từ 0 đến ${LOW_STOCK_THRESHOLD} · ${sourceUpdated(w.productsUpdatedAt)}`} href="/admin/products">
        {w.productsLoading ? <AdminDataState variant="loading" title="Đang tải tồn kho…" /> : w.productsError ? <AdminDataState variant="error" title="Không tải được tồn kho." onRetry={w.refreshProducts} /> : w.outOfStockCount + w.lowStockCount === 0 ? <AdminDataState variant="empty" title="Không có sản phẩm cần bổ sung." /> : <><p className="mb-2 text-sm text-muted-text">{w.outOfStockCount} hết khả dụng · {w.lowStockCount} còn ít</p>{w.productsToRestock.map((product) => <Link key={product.id} href="/admin/products" className="flex min-w-0 items-center justify-between gap-3 border-b border-border-subtle py-3 last:border-0 hover:text-admin-primary"><span className="min-w-0"><strong className="block truncate text-sm">{product.name}</strong><small className="text-muted-text">{getProductCategoryLabel(product.category)}</small></span><span className="shrink-0 text-sm font-semibold">{product.stock} khả dụng</span></Link>)}</>}
      </Panel>
      <Panel title="Tình hình hôm nay" detail={`Theo lúc ghi nhận giao dịch, đã trừ khoản hoàn · ${sourceUpdated(w.transactionsUpdatedAt)}`} href="/admin/transactions">
        {w.transactionsLoading ? <AdminDataState variant="loading" title="Đang tải giao dịch…" /> : w.transactionsError ? <AdminDataState variant="error" title="Không tải được giao dịch." onRetry={w.refreshTransactions} /> : <><div className="grid gap-3 sm:grid-cols-3">{[["Thực thu", w.transactionSummary?.revenue ?? 0], ["Tiền mặt", w.transactionSummary?.cash ?? 0], ["QR", w.transactionSummary?.bankTransfer ?? 0]].map(([label, amount]) => <div key={label} className="rounded-xl bg-admin-muted-surface p-3"><p className="text-sm text-muted-text">{label}</p><strong className="mt-1 block break-words text-lg tabular-nums text-ink">{money(Number(amount))}</strong></div>)}</div><p className="mt-3 text-sm text-muted-text">{w.transactionSummary?.transactionCount ?? 0} giao dịch · {w.operationalBookingSummary.cancelled} lịch hủy · {w.operationalBookingSummary.noShow} không đến</p></>}
        <div className="mt-5 border-t border-border-subtle pt-4"><h3 className="mb-3 text-sm font-semibold">Thực thu 7 ngày gần nhất <span className="font-normal text-muted-text">· {sourceUpdated(w.trendUpdatedAt)}</span></h3>{w.trendLoading ? <AdminDataState variant="loading" title="Đang tải xu hướng…" /> : w.trendError ? <AdminDataState variant="error" title="Không tải được xu hướng." /> : <div className="grid grid-cols-7 items-end gap-2">{w.trend.map((day) => <div key={day.date} className="min-w-0 text-center"><div className="flex h-28 items-end rounded-lg bg-admin-muted-surface"><div title={`${day.date}: ${money(day.revenue)}`} className="w-full rounded-t-md bg-admin-primary" style={{ height: `${Math.max(day.revenue > 0 ? 6 : 0, Math.max(0, day.revenue) / maxTrend * 100)}%` }} /></div><span className="mt-1 block text-xs text-muted-text">{day.name}</span></div>)}</div>}</div>
      </Panel>
    </section>
  </AdminPageShell>;
}
