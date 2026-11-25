import { Phone } from "lucide-react";
import type { BookingRecord } from "@/lib/admin-booking-record";

export function BookingCustomerInfoCard({ booking }: { booking: BookingRecord }) {
  return (
    <section aria-labelledby="booking-customer-heading" className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 id="booking-customer-heading" className="whitespace-nowrap text-sm font-semibold text-slate-600">Thông tin khách hàng</h3>
        <span className="shrink-0 whitespace-nowrap rounded border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-bold text-primary">
          {booking.customer.loyaltyPointsLabel}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2 pt-1 text-xs">
        <p className="text-sm font-bold text-ink">{booking.customer.name}</p>
        {booking.customer.phone && (
          <a
            href={`tel:${booking.customer.phone}`}
            aria-label={`Gọi ${booking.customer.name}`}
            className="flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border-subtle bg-slate-50 px-3 py-1.5 font-bold text-primary transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary focus-visible:ring-offset-2"
          >
            <Phone aria-hidden="true" className="size-3.5" />
            <span>{booking.customer.phone}</span>
          </a>
        )}
      </div>

      {booking.parentNotes && (
        <div className="rounded-lg border border-border-subtle bg-slate-50 p-3 text-xs text-slate-800">
          <strong className="mb-0.5 block text-ink">Lời dặn dò từ khách hàng:</strong>
          &ldquo;{booking.parentNotes}&rdquo;
        </div>
      )}
    </section>
  );
}
