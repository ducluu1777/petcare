"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, Gauge, Pencil, Plus, RefreshCw, Save, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { apiClient } from "@/lib/api-client";
import { getAiTokenMetrics } from "@/lib/ai-token-usage";
import { getDisplayLabel } from "@/lib/domain-labels";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type AiOverview = {
  dailyRequestLimit: number;
  modelRequestsToday: number;
  totalRequestsToday: number;
  fallbackRequestsToday: number;
  providerErrorsToday: number;
  remainingModelRequests: number;
  dailyUsage: Array<{
    date: string;
    totalRequests: number;
    modelRequests: number;
    fallbackResponses: number;
    providerErrors: number;
  }>;
  providerTokenUsageToday?: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  } | null;
  knowledge: { sources: number; chunks: number; indexedChunks: number; model: string };
  recentRequests: Array<{
    requestId: string;
    source: "model" | "fallback";
    model: string;
    durationMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    reason: string | null;
    status: number | null;
    createdAt: string;
  }>;
};

type AiUsage = AiOverview["recentRequests"][number];

type KnowledgeEntry = {
  id: string;
  title: string;
  answer: string | null;
  content: string;
  source: string;
  reviewedAt: string;
  enabled: boolean;
  updatedAt: string;
};

type KnowledgeForm = {
  title: string;
  answer: string;
  content: string;
  source: string;
  reviewedAt: string;
};

const emptyForm: KnowledgeForm = {
  title: "",
  answer: "",
  content: "",
  source: "Nội dung do quản trị viên thêm",
  reviewedAt: new Date().toISOString().slice(0, 10),
};

const formatTokens = (value: number | null | undefined) =>
  value == null ? "Chưa có số liệu" : new Intl.NumberFormat("vi-VN").format(value);

export default function AdminAiPage() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState<string | null>(null);
  const [usageRange, setUsageRange] = useState<7 | 30>(7);
  const [form, setForm] = useState<KnowledgeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const { data, isLoading, isFetching, error: loadError, refetch } = useQuery({
    queryKey: ["admin-ai-assistant", usageRange],
    queryFn: async () => {
      const [overview, entries] = await Promise.all([
        apiClient.get<AiOverview>(`/ai/admin/overview?days=${usageRange}`),
        apiClient.get<KnowledgeEntry[]>("/ai/admin/knowledge"),
      ]);
      return { overview, entries };
    },
    refetchInterval: 30_000,
  });
  const selectedUsageQuery = useQuery({
    queryKey: ["admin-ai-usage", selectedRequestId],
    queryFn: () => apiClient.get<AiUsage | null>(`/ai/admin/usage/${encodeURIComponent(selectedRequestId!)}`),
    enabled: !!selectedRequestId,
  });
  useEffect(() => {
    setSelectedRequestId(new URLSearchParams(window.location.search).get("requestId"));
  }, []);
  useEffect(() => {
    if (selectedRequestId && !selectedUsageQuery.isLoading) {
      document.getElementById("ai-usage")?.scrollIntoView({ block: "start" });
    }
  }, [selectedRequestId, selectedUsageQuery.isLoading]);
  const overview = data?.overview ?? null;
  const entries = data?.entries ?? [];
  const knowledgeStatus = overview?.knowledge;
  const dailyLimitValue = dailyLimit ?? String(overview?.dailyRequestLimit ?? 1000);
  const tokenMetrics = getAiTokenMetrics(overview?.providerTokenUsageToday);

  const saveLimit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setActionError("");
    setNotice("");
    try {
      await apiClient.patch("/ai/admin/settings", { dailyRequestLimit: Number(dailyLimitValue) });
      setDailyLimit(null);
      setNotice("Đã lưu giới hạn lượt gọi AI mỗi ngày.");
      await refetch();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Không thể lưu giới hạn.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveKnowledge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setActionError("");
    setNotice("");
    try {
      if (editingId) {
        await apiClient.patch(`/ai/admin/knowledge/${editingId}`, form);
        setNotice("Đã cập nhật nội dung kiến thức.");
      } else {
        await apiClient.post("/ai/admin/knowledge", form);
        setNotice("Đã thêm nội dung kiến thức.");
      }
      setForm({ ...emptyForm, reviewedAt: new Date().toISOString().slice(0, 10) });
      setEditingId(null);
      await refetch();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Không thể lưu nội dung.");
    } finally {
      setIsSaving(false);
    }
  };

  const editEntry = (entry: KnowledgeEntry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      answer: entry.answer ?? "",
      content: entry.content,
      source: entry.source,
      reviewedAt: entry.reviewedAt,
    });
  };

  const setEnabled = async (entry: KnowledgeEntry, enabled: boolean) => {
    setActionError("");
    setNotice("");
    try {
      await apiClient.patch(`/ai/admin/knowledge/${entry.id}/enabled`, { enabled });
      setNotice(enabled ? "Đã bật nội dung kiến thức." : "Đã tắt nội dung kiến thức.");
      await refetch();
    } catch (toggleError) {
      setActionError(toggleError instanceof Error ? toggleError.message : "Không thể cập nhật trạng thái.");
    }
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Trợ lý AI"
        title="Chatbot & knowledge base"
        description="Theo dõi hạn mức nội bộ, rà soát câu trả lời và quản lý nội dung được chatbot tra cứu."
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {(actionError || loadError) && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError || (loadError instanceof Error ? loadError.message : "Không thể tải cấu hình chatbot.")}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section aria-label="Hạn mức chatbot" className="space-y-4">
        <div className="flex items-center gap-2">
          <Gauge className="size-5 text-admin-primary" />
          <h2 className="text-lg font-semibold text-ink">Hạn mức sử dụng</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Lượt gọi model hôm nay", overview?.modelRequestsToday],
            ["Còn lại trong hạn mức", overview?.remainingModelRequests],
            ["Phản hồi dự phòng hôm nay", overview?.fallbackRequestsToday],
            ["Lỗi nhà cung cấp hôm nay", overview?.providerErrorsToday],
            ["Tổng lượt chat hôm nay", overview?.totalRequestsToday],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border-subtle bg-surface p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{isLoading ? "…" : value ?? 0}</p>
            </div>
          ))}
        </div>
        <form onSubmit={saveLimit} className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1.5 text-sm font-medium text-ink">
            Giới hạn gọi model mỗi ngày
            <input
              type="number"
              min={1}
              max={100000}
              required
              value={dailyLimitValue}
              onChange={(event) => setDailyLimit(event.target.value)}
              className="h-10 rounded-md border border-border-subtle bg-background px-3"
            />
          </label>
          <button disabled={isSaving || isLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-admin-primary px-4 text-sm font-semibold text-white disabled:opacity-60">
            <Save className="size-4" /> Lưu hạn mức
          </button>
        </form>
        <p className="text-sm text-muted-foreground">
          Hạn mức này áp dụng trong PetCare; khi chạm giới hạn, hệ thống không gửi thêm yêu cầu tới model. Quota và billing của Google thuộc project, không đọc được chỉ bằng API key. Xem giới hạn của Google trong{" "}
          <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="font-medium text-admin-primary underline">Google AI Studio</a>.
        </p>
      </section>

      <section aria-label="Token Gemini thực tế" className="space-y-3 pt-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Token Gemini hôm nay</h2>
          <p className="text-sm text-muted-foreground">
            Tổng hợp metadata token Google trả về cho các lượt gọi model. Dữ liệu cũ hoặc phản hồi không có metadata sẽ không được ước tính.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {tokenMetrics.map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border-subtle bg-surface p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-ink">
                {isLoading ? "…" : formatTokens(value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Mức sử dụng theo thời gian" className="min-w-0 space-y-4 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Mức sử dụng theo thời gian</h2>
            <p className="text-sm text-muted-foreground">Lượt gọi model, phản hồi dự phòng và lỗi nhà cung cấp theo ngày, giờ Việt Nam.</p>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Khoảng thống kê
            <select
              value={usageRange}
              onChange={(event) => setUsageRange(Number(event.target.value) as 7 | 30)}
              className="h-10 rounded-md border border-border-subtle bg-surface px-3"
            >
              <option value={7}>7 ngày gần nhất</option>
              <option value={30}>30 ngày gần nhất</option>
            </select>
          </label>
        </div>
        <div className="h-72 min-w-0 rounded-xl border border-border-subtle bg-surface p-3 sm:p-4">
          {isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Đang tải lịch sử sử dụng…</p>
          ) : !overview?.dailyUsage.length ? (
            <p className="p-5 text-sm text-muted-foreground">Chưa có số liệu trong khoảng thời gian này.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.dailyUsage} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  interval={usageRange === 30 ? 4 : 0}
                  tickFormatter={(date: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(`${date}T00:00:00+07:00`))}
                  tick={{ fontSize: 12 }}
                  minTickGap={8}
                />
                <YAxis allowDecimals={false} width={42} tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(date) => `Ngày ${new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(`${String(date)}T00:00:00+07:00`))}`}
                  contentStyle={{ borderRadius: 10, borderColor: "#e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="modelRequests" name="Lượt gọi model" fill="#0f766e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="fallbackResponses" name="Phản hồi dự phòng" fill="#d97706" radius={[3, 3, 0, 0]} />
                <Bar dataKey="providerErrors" name="Lỗi nhà cung cấp" fill="#dc2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Số liệu tự làm mới mỗi 30 giây. Một lượt gọi AI bị lỗi có thể đồng thời được tính vào số phản hồi dự phòng.</p>
      </section>

      <section aria-label="Knowledge base" className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BookOpenText className="size-5 text-admin-primary" />
              <h2 className="text-lg font-semibold text-ink">Knowledge base</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {knowledgeStatus?.chunks ?? 0} nội dung đang dùng, {knowledgeStatus?.sources ?? 0} nguồn, {knowledgeStatus?.indexedChunks ?? 0} vector.
            </p>
            {knowledgeStatus && knowledgeStatus.chunks > 0 && knowledgeStatus.indexedChunks === 0 && (
              <p className="mt-1 text-xs text-amber-700">Đang tra cứu bằng từ khóa; kiểm tra cấu hình embedding nếu cần tìm kiếm ngữ nghĩa.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setForm({ ...emptyForm, reviewedAt: new Date().toISOString().slice(0, 10) }); setEditingId(null); }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border-subtle bg-surface px-4 text-sm font-semibold text-ink"
          >
            <Plus className="size-4" /> Thêm nội dung
          </button>
        </div>

        <form onSubmit={saveKnowledge} className="grid gap-4 rounded-xl border border-border-subtle bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-ink">{editingId ? "Chỉnh sửa nội dung" : "Nội dung mới"}</h3>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <X className="size-4" /> Hủy sửa
              </button>
            )}
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Tiêu đề
            <input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="h-10 rounded-md border border-border-subtle bg-background px-3" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Trả lời nhanh
            <textarea maxLength={1000} rows={2} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} className="rounded-md border border-border-subtle bg-background px-3 py-2" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Nội dung chi tiết
            <textarea required maxLength={12000} rows={5} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="rounded-md border border-border-subtle bg-background px-3 py-2" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Nguồn
              <input required maxLength={120} value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className="h-10 rounded-md border border-border-subtle bg-background px-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Ngày rà soát
              <input required type="date" value={form.reviewedAt} onChange={(event) => setForm({ ...form, reviewedAt: event.target.value })} className="h-10 rounded-md border border-border-subtle bg-background px-3" />
            </label>
          </div>
          <div>
            <button disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-md bg-admin-primary px-4 text-sm font-semibold text-white disabled:opacity-60">
              <Save className="size-4" /> {isSaving ? "Đang lưu…" : editingId ? "Lưu thay đổi" : "Thêm vào knowledge base"}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {isLoading ? (
            <p className="rounded-xl border border-border-subtle bg-surface p-6 text-sm text-muted-foreground">Đang tải knowledge base…</p>
          ) : entries.length === 0 ? (
            <p className="rounded-xl border border-border-subtle bg-surface p-6 text-sm text-muted-foreground">Chưa có nội dung kiến thức.</p>
          ) : entries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-border-subtle bg-surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{entry.title}</h3>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${entry.enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {entry.enabled ? "Đang bật" : "Đã tắt"}
                    </span>
                  </div>
                  {entry.answer && <p className="mt-2 text-sm text-ink">{entry.answer}</p>}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{entry.content}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Nguồn: {entry.source} · Rà soát: {entry.reviewedAt}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => editEntry(entry)} aria-label={`Sửa ${entry.title}`} className="inline-flex h-9 items-center gap-1 rounded-md border border-border-subtle px-3 text-sm">
                    <Pencil className="size-4" /> Sửa
                  </button>
                  <button type="button" onClick={() => void setEnabled(entry, !entry.enabled)} aria-label={entry.enabled ? `Tắt ${entry.title}` : `Bật ${entry.title}`} className="inline-flex h-9 items-center gap-1 rounded-md border border-border-subtle px-3 text-sm">
                    {entry.enabled ? "Tắt" : "Bật"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedRequestId && (
        <section id="ai-usage" aria-label="Chi tiết lượt xử lý AI" className="scroll-mt-6 space-y-3 rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink">Lượt xử lý AI</h2>
              <p className="break-all text-sm text-muted-foreground">{selectedRequestId}</p>
            </div>
            <Link href="/admin/ai#ai-usage-history" className="text-sm font-semibold text-admin-primary hover:underline">Xem thống kê chung</Link>
          </div>
          {selectedUsageQuery.isLoading ? <p className="text-sm text-muted-foreground">Đang tải lượt xử lý…</p>
            : selectedUsageQuery.isError ? <p role="alert" className="text-sm text-rose-700">Không tải được lượt xử lý này.</p>
              : !selectedUsageQuery.data ? <p className="text-sm text-muted-foreground">Không còn bản ghi lượt xử lý này.</p>
                : <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">Thời điểm</dt><dd>{new Date(selectedUsageQuery.data.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</dd></div>
                  <div><dt className="text-muted-foreground">Mô hình AI</dt><dd className="break-all">{selectedUsageQuery.data.model}</dd></div>
                  <div><dt className="text-muted-foreground">Nguồn và trạng thái</dt><dd>{getDisplayLabel("aiSource", selectedUsageQuery.data.source)}{selectedUsageQuery.data.status !== null ? ` · HTTP ${selectedUsageQuery.data.status}` : ""}</dd></div>
                  <div><dt className="text-muted-foreground">Lý do</dt><dd>{selectedUsageQuery.data.reason ? getDisplayLabel("aiReason", selectedUsageQuery.data.reason) : "Không có lỗi"}</dd></div>
                  <div><dt className="text-muted-foreground">Thời gian xử lý</dt><dd>{selectedUsageQuery.data.durationMs} ms</dd></div>
                  <div><dt className="text-muted-foreground">Token thực</dt><dd>{formatTokens(selectedUsageQuery.data.totalTokens)}</dd></div>
                </dl>}
        </section>
      )}
      <section id="ai-usage-history" aria-label="Lịch sử sử dụng chatbot" className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Chi tiết lượt xử lý</h2>
            <p className="text-sm text-muted-foreground">Tối đa 50 lượt trong {usageRange} ngày gần nhất; không lưu nội dung tin nhắn.</p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Làm mới thống kê AI"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface text-muted-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border-subtle bg-muted/40 text-xs text-muted-foreground">
              <tr><th className="px-4 py-3">Thời điểm</th><th className="px-4 py-3">Mô hình AI</th><th className="px-4 py-3">Nguồn phản hồi</th><th className="px-4 py-3">Trạng thái / lý do</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Token thực</th></tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {overview?.recentRequests.map((request) => (
                <tr key={request.requestId}>
                  <td className="whitespace-nowrap px-4 py-3">{new Date(request.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td>
                  <td className="max-w-44 truncate px-4 py-3 font-mono text-xs" title={request.model}>{request.model}</td>
                  <td className="px-4 py-3">{getDisplayLabel("aiSource", request.source)}</td>
                  <td className={`px-4 py-3 ${request.status !== null ? "font-medium text-red-700" : "text-ink"}`}>
                    {request.status !== null
                      ? `Lỗi HTTP ${request.status}${request.reason ? ` · ${getDisplayLabel("aiReason", request.reason)}` : ""}`
                      : request.reason
                        ? getDisplayLabel("aiReason", request.reason)
                        : request.source === "model" ? "Hoàn tất" : getDisplayLabel("aiSource", request.source)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{request.durationMs} ms</td>
                  <td className="px-4 py-3 tabular-nums">{formatTokens(request.totalTokens)}</td>
                </tr>
              ))}
              {!isLoading && !overview?.recentRequests.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Chưa có lượt chat trong khoảng thời gian này.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPageShell>
  );
}
