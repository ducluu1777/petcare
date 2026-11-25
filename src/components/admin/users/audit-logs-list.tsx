import { FileText, Loader2 } from "lucide-react";
import { useUserAuditLogs } from "@/hooks/use-users";
import { getDisplayLabel } from "@/lib/domain-labels";

const DETAIL_LABELS: Record<string, string> = {
  points: "Điểm điều chỉnh",
  reason: "Lý do",
  previousBalance: "Điểm trước điều chỉnh",
  newBalance: "Điểm sau điều chỉnh",
  previousRole: "Vai trò trước đó",
  newRole: "Vai trò mới",
  previousIsActive: "Trạng thái trước đó",
  newIsActive: "Trạng thái mới",
  recoveryWindowDays: "Thời hạn khôi phục (ngày)",
  old: "Thông tin trước đó",
  new: "Thông tin mới",
  name: "Họ và tên",
  email: "Email",
  phone: "Số điện thoại",
};

type AuditDetailRow = { label: string; value: string };

function asAuditRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getDetailLabel(key: string) {
  return DETAIL_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toLocaleUpperCase("vi-VN"));
}

function formatAuditValue(value: unknown, key?: string): string {
  if (value == null || value === "") return "Chưa có thông tin";
  if (typeof value === "boolean") {
    if (key?.toLowerCase().includes("active")) return value ? "Đang hoạt động" : "Đã khóa";
    return value ? "Có" : "Không";
  }
  if (typeof value === "number") {
    return key?.toLowerCase().includes("balance")
      ? `${value.toLocaleString("vi-VN")} điểm`
      : value.toLocaleString("vi-VN");
  }
  if (typeof value === "string") return key && /roles?$/i.test(key) ? getDisplayLabel("userRole", value) : value;
  if (Array.isArray(value)) return value.map((item) => formatAuditValue(item, key)).join(", ");

  const record = asAuditRecord(value);
  if (!record) return String(value);
  return Object.entries(record)
    .map(([childKey, childValue]) => `${getDetailLabel(childKey)}: ${formatAuditValue(childValue, childKey)}`)
    .join(" · ");
}

function getAuditDetailRows(action: string, details: unknown): AuditDetailRow[] {
  const record = asAuditRecord(details);
  if (!record) return [];

  if (action === "ADJUST_LOYALTY_POINTS") {
    const points = typeof record.points === "number" ? record.points : null;
    return [
      ...(points === null ? [] : [{ label: "Điểm điều chỉnh", value: `${points > 0 ? "+" : "−"}${Math.abs(points).toLocaleString("vi-VN")} điểm` }]),
      { label: "Điểm trước điều chỉnh", value: formatAuditValue(record.previousBalance, "previousBalance") },
      { label: "Điểm sau điều chỉnh", value: formatAuditValue(record.newBalance, "newBalance") },
      ...(typeof record.reason === "string" ? [{ label: "Lý do", value: record.reason }] : []),
    ];
  }

  if (action === "ADMIN_UPDATE_PROFILE" || action === "UPDATE_PROFILE") {
    const previous = asAuditRecord(record.old);
    const next = asAuditRecord(record.new);
    if (previous && next) {
      return (["name", "email", "phone"] as const)
        .filter((key) => previous[key] !== next[key])
        .map((key) => ({
          label: getDetailLabel(key),
          value: `${formatAuditValue(previous[key])} → ${formatAuditValue(next[key])}`,
        }));
    }
  }

  return Object.entries(record).map(([key, value]) => ({
    label: getDetailLabel(key),
    value: formatAuditValue(value, key),
  }));
}

function AuditLogDetails({ action, details }: { action: string; details: unknown }) {
  const rows = getAuditDetailRows(action, details);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted-text">
        Không có thông tin chi tiết cho thao tác này.
      </p>
    );
  }

  return (
    <dl className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0 rounded-md bg-surface px-3 py-2">
          <dt className="text-xs font-medium text-muted-text">{row.label}</dt>
          <dd className="mt-0.5 break-words font-semibold leading-relaxed text-slate-700">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditLogsList({ userId }: { userId: string }) {
  const { data: logs, isLoading, error } = useUserAuditLogs(userId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
        <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
        <span className="text-xs">Đang tải lịch sử hoạt động...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700">
        Không thể tải nhật ký hoạt động. Vui lòng thử lại.
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="space-y-2 py-12 text-center text-muted-text">
        <FileText aria-hidden="true" className="mx-auto size-8 stroke-[1.5] text-slate-300" />
        <p className="text-xs font-semibold text-ink">Chưa có nhật ký kiểm toán nào</p>
        <p className="mx-auto max-w-sm text-xs text-muted-text">
          Các thao tác phân quyền, thay đổi điểm tích lũy và cập nhật trạng thái của tài khoản này sẽ được lưu trữ tự động tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <article key={log.id} className="rounded-xl border border-slate-200 bg-surface p-4 shadow-2xs">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-ink">{getDisplayLabel("auditAction", log.action)}</h3>
            <time dateTime={log.createdAt} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {new Date(log.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
            </time>
          </div>
          <p className="mb-2 text-xs text-slate-600">
            Thực hiện bởi: <strong className="text-slate-800">{log.performedBy?.name || "Hệ thống"}</strong>
            {log.performedBy?.email && <span className="text-slate-500"> · {log.performedBy.email}</span>}
          </p>
          <AuditLogDetails action={log.action} details={log.details} />
        </article>
      ))}
    </div>
  );
}
