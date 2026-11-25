"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { getDisplayLabel } from "@/lib/domain-labels";

type RequestStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";
type ContactRequest = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  topic: string;
  petInfo: string | null;
  message: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
};
type ContactRequestList = { items: ContactRequest[]; total: number; page: number; pageSize: number };

const FILTERS: Array<{ label: string; value?: RequestStatus }> = [
  { label: "Tất cả" },
  { label: "Mới", value: "NEW" },
  { label: "Đang xử lý", value: "IN_PROGRESS" },
  { label: "Đã giải quyết", value: "RESOLVED" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminContactRequestsPage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const enabled = !!token && (user?.role === "ADMIN" || user?.role === "STAFF");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RequestStatus | undefined>();
  const [page, setPage] = useState(1);

  const requestsQuery = useQuery({
    queryKey: ["admin-contact-requests", status ?? "ALL", page],
    queryFn: () => apiClient.get<ContactRequestList>("/contact-requests/admin", {
      params: { status, page, pageSize: 20 },
    }),
    enabled,
    refetchInterval: 30_000,
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: RequestStatus }) =>
      apiClient.patch<ContactRequest>(`/contact-requests/admin/${id}/status`, { status: nextStatus }),
    onSuccess: async (_request, variables) => {
      toast.success(`Đã cập nhật: ${getDisplayLabel("contactStatus", variables.nextStatus).toLowerCase()}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-contact-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "contact-requests"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Chưa cập nhật được yêu cầu."),
  });

  const data = requestsQuery.data;
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));
  const refresh = () => requestsQuery.refetch();

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Khách hàng"
        subsection="Yêu cầu liên hệ"
        title="Lời nhắn từ khách hàng"
        description="Xem thông tin khách gửi và cập nhật tiến độ phản hồi để cả ca cùng theo dõi."
        onRefresh={refresh}
        isRefreshing={requestsQuery.isFetching}
      />

      <section aria-label="Lọc yêu cầu liên hệ" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          return (
            <button
              key={filter.label}
              type="button"
              aria-pressed={active}
              onClick={() => { setPage(1); setStatus(filter.value); }}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${active ? "border-admin-primary bg-admin-primary text-white" : "border-border-subtle bg-surface text-ink hover:border-admin-primary"}`}
            >
              {filter.label}
            </button>
          );
        })}
        {data && <span className="ml-auto self-center text-sm text-muted-text">{data.total} yêu cầu</span>}
      </section>

      {!enabled ? (
        <AdminDataState
          variant="error"
          title="Cần đăng nhập bằng tài khoản quản trị viên hoặc nhân viên."
          description="Đăng nhập xong, bạn có thể xem và cập nhật các yêu cầu liên hệ tại đây."
          className="rounded-2xl border border-border-subtle bg-surface"
        />
      ) : requestsQuery.isLoading ? (
        <AdminDataState variant="loading" title="Đang tải yêu cầu liên hệ…" className="rounded-2xl border border-border-subtle bg-surface" />
      ) : requestsQuery.isError ? (
        <AdminDataState variant="error" title="Không tải được yêu cầu liên hệ." onRetry={refresh} className="rounded-2xl border border-border-subtle bg-surface" />
      ) : !data?.items.length ? (
        <AdminDataState
          variant="empty"
          title={status ? `Chưa có yêu cầu ở trạng thái “${getDisplayLabel("contactStatus", status)}”.` : "Chưa có lời nhắn nào từ khách hàng."}
          description="Khi khách gửi form liên hệ, yêu cầu sẽ xuất hiện tại đây."
          className="rounded-2xl border border-border-subtle bg-surface"
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((request) => (
            <article key={request.id} className="min-w-0 rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-base font-bold text-ink">{request.fullName}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === "NEW" ? "bg-amber-100 text-amber-900" : request.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-900" : "bg-emerald-100 text-emerald-900"}`}>
                      {getDisplayLabel("contactStatus", request.status)}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm text-muted-text">{getDisplayLabel("contactTopic", request.topic)} · Gửi lúc {formatDate(request.createdAt)}</p>
                </div>
                <a href={`tel:${request.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-border-subtle px-3 text-sm font-semibold text-admin-primary hover:bg-admin-muted-surface">
                  <Phone className="size-4" /> {request.phone}
                </a>
              </div>

              <dl className="grid min-w-0 gap-x-6 gap-y-3 py-4 text-sm sm:grid-cols-2">
                <div className="min-w-0"><dt className="text-xs font-semibold text-muted-text">Email</dt><dd className="mt-1 break-all text-ink">{request.email || "Không cung cấp"}</dd></div>
                <div className="min-w-0"><dt className="text-xs font-semibold text-muted-text">Thú cưng</dt><dd className="mt-1 break-words text-ink">{request.petInfo || "Không cung cấp"}</dd></div>
              </dl>
              <div className="rounded-xl bg-admin-muted-surface p-3 sm:p-4">
                <p className="mb-1 text-xs font-semibold text-muted-text">Nội dung khách gửi</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink">{request.message}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted-text">Cập nhật gần nhất: {formatDate(request.updatedAt)}</span>
                <div className="flex flex-wrap gap-2">
                  {request.status === "NEW" && <button type="button" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: request.id, nextStatus: "IN_PROGRESS" })} className="min-h-10 rounded-xl border border-border-subtle px-3 text-sm font-semibold hover:bg-admin-muted-surface disabled:opacity-50">Bắt đầu xử lý</button>}
                  {request.status !== "RESOLVED" && <button type="button" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: request.id, nextStatus: "RESOLVED" })} className="min-h-10 rounded-xl bg-admin-primary px-3 text-sm font-semibold text-white hover:bg-admin-primary-hover disabled:opacity-50">Đánh dấu đã giải quyết</button>}
                  {request.status === "RESOLVED" && <button type="button" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: request.id, nextStatus: "NEW" })} className="min-h-10 rounded-xl border border-border-subtle px-3 text-sm font-semibold hover:bg-admin-muted-surface disabled:opacity-50">Mở lại yêu cầu</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && data.total > 20 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4 text-sm">
          <span className="text-muted-text">Trang {page} / {pages} · {data.total} yêu cầu</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-xl border border-border-subtle px-4 disabled:opacity-40">Trước</button>
            <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-xl border border-border-subtle px-4 disabled:opacity-40">Sau</button>
          </div>
        </div>
      )}

    </AdminPageShell>
  );
}
