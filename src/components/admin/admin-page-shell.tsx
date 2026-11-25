import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageShellProps {
  children: ReactNode;
  className?: string;
}

export function AdminPageShell({ children, className }: AdminPageShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] space-y-6 pb-12 font-admin text-ink", className)}>
      {children}
    </div>
  );
}
