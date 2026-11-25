import { Badge } from "@/components/ui/badge";
import { getAdminBookingStatusLabel } from "@/lib/admin-booking-status";
import type { PetProfile } from "@/lib/admin-pet-profile";

interface PetRecentBookingsCardProps {
  totalBookings: number;
  recentBookings: PetProfile["recentBookings"];
}

export function PetRecentBookingsCard({ totalBookings, recentBookings }: PetRecentBookingsCardProps) {
  return (
    <section aria-labelledby="pet-recent-bookings-title" className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <h3 id="pet-recent-bookings-title" className="font-semibold text-slate-700">Lịch hẹn gần đây</h3>
        <span className="text-xs text-muted-text">{totalBookings} lịch · hiển thị tối đa 5</span>
      </div>
      {recentBookings.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-slate-50 p-3 text-xs text-muted-text">Chưa có lịch hẹn.</p>
      ) : (
        <ul className="space-y-2">
          {recentBookings.map((booking) => (
            <li key={booking.id} className="rounded-lg border border-border-subtle bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <strong className="text-ink">{booking.code}</strong>
                  <Badge variant="outline" className="border-border-subtle bg-surface text-xs">
                    {getAdminBookingStatusLabel(booking.status)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-text">{booking.scheduledAt}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-primary">
                {booking.services.length > 0 ? booking.services.join(", ") : "Chưa có thông tin dịch vụ"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
