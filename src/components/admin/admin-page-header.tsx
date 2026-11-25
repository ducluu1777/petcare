import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminPageHeaderProps = {
  section: string;
  subsection?: string;
  title: string;
  description: string;
  density?: "default" | "compact";
  onRefresh: () => unknown;
  isRefreshing?: boolean;
  refreshDisabled?: boolean;
  actions?: ReactNode;
};

export function AdminPageHeader({
  section,
  subsection,
  title,
  description,
  density = "default",
  onRefresh,
  isRefreshing = false,
  refreshDisabled = false,
  actions,
}: AdminPageHeaderProps) {
  const isCompact = density === "compact";

  return (
    <header className={`flex min-w-0 flex-col justify-between border-b border-admin-border-quiet ${isCompact ? "gap-3 pb-3 2xl:flex-row 2xl:items-end" : "gap-4 pb-5 2xl:flex-row 2xl:items-end"}`}>
      <div className="w-full min-w-0 2xl:flex-1">
        <p className={`${isCompact ? "sr-only" : "mb-1.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold tracking-[0.04em] text-muted-text"}`}>
          <span className="text-admin-primary">{section}</span>
          {subsection && <><span aria-hidden="true" className="text-admin-muted">/</span><span>{subsection}</span></>}
        </p>
        <h1 className={`text-ink ${isCompact ? "text-xl font-semibold tracking-tight sm:text-2xl" : "text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]"}`}>{title}</h1>
        <p className={isCompact ? "mt-1 hidden max-w-2xl text-sm leading-5 text-muted-text sm:block" : "mt-1.5 max-w-2xl text-sm leading-6 text-muted-text"}>{description}</p>
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 2xl:w-auto 2xl:shrink-0 2xl:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => { void onRefresh(); }}
          disabled={isRefreshing || refreshDisabled}
          aria-busy={isRefreshing}
          className={`rounded-lg border-border-subtle ${isCompact ? "h-10 px-3 text-sm" : "h-10 px-3.5 text-sm"}`}
        >
          <RefreshCw aria-hidden="true" className={`size-4 text-admin-primary ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Đang làm mới…" : "Làm mới"}
        </Button>
        {isRefreshing && <span role="status" className="sr-only">Đang làm mới dữ liệu.</span>}
        {actions}
      </div>
    </header>
  );
}
