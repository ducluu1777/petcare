import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminDataStateProps = {
  variant: "loading" | "error" | "empty";
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  onRetry?: () => unknown;
  className?: string;
};

export function AdminDataState({
  variant,
  title,
  description,
  icon,
  action,
  onRetry,
  className,
}: AdminDataStateProps) {
  const isError = variant === "error";
  const isLoading = variant === "loading";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isLoading ? "polite" : undefined}
      className={cn(
        "flex min-h-44 flex-col items-center justify-center gap-2 px-5 py-8 text-center",
        isError ? "text-red-800" : "text-muted-text",
        className,
      )}
    >
      {isLoading ? (
        <Loader2 aria-hidden="true" className="size-5 animate-spin text-admin-primary" />
      ) : (
        icon ?? (isError
          ? <AlertCircle aria-hidden="true" className="size-5 text-red-600" />
          : <Inbox aria-hidden="true" className="size-5 text-admin-muted" />)
      )}
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-md text-xs leading-5 text-muted-text">{description}</p>}
      {action && <div className="pt-1">{action}</div>}
      {isError && onRetry && (
        <Button
          type="button"
          variant="link"
          onClick={() => { void onRetry(); }}
          className="h-10 rounded-md px-3 text-sm font-semibold text-red-800"
        >
          Thử lại
        </Button>
      )}
    </div>
  );
}
