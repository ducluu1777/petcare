"use client";

import { Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export type BookingViewLayout = "TABLE" | "CALENDAR";

interface BookingViewSwitcherProps {
  value: BookingViewLayout;
  onChange: (layout: BookingViewLayout) => void;
}

export function BookingViewSwitcher({ value, onChange }: BookingViewSwitcherProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border-subtle bg-slate-100 p-1" role="group" aria-label="Chế độ xem lịch hẹn">
      <Button
        type="button"
        aria-pressed={value === "CALENDAR"}
        onClick={() => onChange("CALENDAR")}
        variant="ghost"
        className={`h-10 inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors ${
          value === "CALENDAR" ? "bg-surface text-primary shadow-xs" : "text-muted-text hover:text-ink"
        }`}
      >
        <Calendar aria-hidden="true" className="size-3.5" />
        <span>Xem lịch</span>
      </Button>
      <Button
        type="button"
        aria-pressed={value === "TABLE"}
        onClick={() => onChange("TABLE")}
        variant="ghost"
        className={`h-10 inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors ${
          value === "TABLE" ? "bg-surface text-primary shadow-xs" : "text-muted-text hover:text-ink"
        }`}
      >
        <FileText aria-hidden="true" className="size-3.5" />
        <span>Danh sách</span>
      </Button>
    </div>
  );
}
