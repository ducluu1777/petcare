import type { ReactNode } from "react";

type MetricTone = "neutral" | "primary" | "success" | "warning" | "danger";

type AdminMetricCardProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: MetricTone;
  detail?: string;
};

const toneClasses: Record<MetricTone, string> = {
  neutral: "bg-admin-muted-surface text-admin-secondary",
  primary: "bg-admin-primary-light text-admin-primary",
  success: "bg-sage-light text-sage-dark",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-800",
};

export function AdminMetricCard({ label, value, icon, tone = "neutral", detail }: AdminMetricCardProps) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4">
      <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-text">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
        {detail && <p className="mt-0.5 text-xs text-muted-text">{detail}</p>}
      </div>
    </article>
  );
}
