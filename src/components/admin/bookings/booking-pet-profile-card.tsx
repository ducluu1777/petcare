import { ChevronDown, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookingPetCareNotes, type BehavioralFlag } from "@/components/admin/bookings/booking-pet-care-notes";
import type { BookingRecord } from "@/lib/admin-booking-record";

type BookingPetProfileCardProps = {
  booking: BookingRecord;
  weightValue: string;
  isSavingWeight: boolean;
  isSavingBehavior: boolean;
  onWeightValueChange: (value: string) => void;
  onSaveWeight: () => void;
  onBehaviorChange: (flag: BehavioralFlag) => void;
};

export function BookingPetProfileCard({
  booking,
  weightValue,
  isSavingWeight,
  isSavingBehavior,
  onWeightValueChange,
  onSaveWeight,
  onBehaviorChange,
}: BookingPetProfileCardProps) {
  const { pet } = booking;
  const canUpdateActualWeight = booking.statusV2 === "ARRIVED" && booking.financial.paymentStatus !== "PAID";
  const isBookingClosed = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(booking.status);

  return (
    <section id="booking-pet-profile-card" aria-label="Hồ sơ và lưu ý chăm sóc thú cưng" className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-lg font-bold text-primary">
            {pet.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-bold text-ink">{pet.name}</h4>
              <Badge variant="outline" className="bg-slate-50 text-xs font-medium">{pet.age}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-text">
              Loài: {pet.species} • Giống: <strong>{pet.breed}</strong>
            </p>
          </div>
        </div>

        <div className="min-w-[130px] rounded-xl border border-border-subtle bg-slate-50 p-2.5 text-right">
          <p className="mb-0.5 text-xs text-muted-text">Cân trong hồ sơ</p>
          <span className="text-lg font-bold text-primary tabular-nums">
            {pet.weight == null ? "Chưa cập nhật" : `${pet.weight} kg`}
          </span>
        </div>
      </div>

      {canUpdateActualWeight && (
        <details key={booking.id} className="group rounded-lg border border-border-subtle bg-slate-50">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
            <Scale aria-hidden="true" className="size-4 shrink-0" />
            Sửa cân nặng
            <ChevronDown aria-hidden="true" className="ml-auto size-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-border-subtle p-3">
            <label htmlFor="booking-actual-weight" className="text-sm font-semibold text-ink">Cân nặng thực tế (kg)</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="booking-actual-weight"
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={weightValue}
                onChange={(event) => onWeightValueChange(event.target.value)}
                placeholder="Ví dụ: 5,1"
                className="min-w-0 flex-1 text-sm font-bold tabular-nums"
              />
              <Button
                type="button"
                disabled={isSavingWeight || !weightValue.trim()}
                onClick={onSaveWeight}
                className="h-10 rounded-lg px-3 text-sm font-semibold sm:shrink-0"
              >
                {isSavingWeight ? "Đang cập nhật…" : "Cập nhật giá & bắt đầu"}
              </Button>
            </div>
          </div>
        </details>
      )}

      <BookingPetCareNotes
        allergies={pet.allergies}
        behavioralFlag={pet.behavioralFlag}
        isSaving={isSavingBehavior}
        readOnly={isBookingClosed}
        onBehaviorChange={onBehaviorChange}
      />
    </section>
  );
}
