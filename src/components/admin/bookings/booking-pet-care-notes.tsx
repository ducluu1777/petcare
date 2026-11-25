import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingRecord } from "@/lib/admin-booking-record";

export type BehavioralFlag = NonNullable<BookingRecord["pet"]["behavioralFlag"]>;

interface BookingPetCareNotesProps {
  allergies: string | null | undefined;
  behavioralFlag?: BehavioralFlag | null;
  isSaving: boolean;
  readOnly: boolean;
  onBehaviorChange: (flag: BehavioralFlag) => void;
}

const behaviorLabels: Record<BehavioralFlag, string> = {
  NORMAL: "Chưa ghi nhận lưu ý",
  AGGRESSIVE: "Có thể phản ứng mạnh",
  TIMID: "Cần thời gian làm quen",
};

export function BookingPetCareNotes({
  allergies,
  behavioralFlag,
  isSaving,
  readOnly,
  onBehaviorChange,
}: BookingPetCareNotesProps) {
  return (
    <div className="space-y-2 pt-1 text-xs">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-amber-900">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700" />
        <div>
          <span className="font-bold text-amber-950">Dị ứng và lưu ý sức khỏe: </span>
          <span>{allergies || "Chưa có ghi chú."}</span>
        </div>
      </div>

      {behavioralFlag !== "NORMAL" && (
        <div className={`flex items-start gap-2 rounded-lg border p-2.5 ${behavioralFlag === "AGGRESSIVE" ? "border-rose-200 bg-rose-50/70 text-rose-900" : "border-amber-200 bg-amber-50/70 text-amber-900"}`}>
          <AlertTriangle aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${behavioralFlag === "AGGRESSIVE" ? "text-rose-700" : "text-amber-700"}`} />
          <div>
            <span className={`font-bold ${behavioralFlag === "AGGRESSIVE" ? "text-rose-950" : "text-amber-950"}`}>Lưu ý khi chăm sóc: </span>
            <span>{behavioralFlag === "AGGRESSIVE" ? "Có thể phản ứng mạnh khi thao tác." : "Cần thời gian làm quen với thao tác."}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-start gap-2 border-t border-border-subtle pt-2 sm:flex-row sm:items-center sm:justify-between">
        <span id="booking-pet-behavior-label" className="text-xs font-bold text-slate-700">
          {readOnly ? "Lưu ý đang lưu trên hồ sơ bé:" : "Lưu ý khi chăm sóc:"}
        </span>
        {readOnly ? (
          <span className="rounded-md border border-border-subtle bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            {behaviorLabels[behavioralFlag ?? "NORMAL"]}
          </span>
        ) : (
          <div role="group" aria-labelledby="booking-pet-behavior-label" className="grid w-full grid-cols-3 gap-1.5 sm:w-auto">
            {(["NORMAL", "AGGRESSIVE", "TIMID"] as const).map((flag) => (
              <Button
                key={flag}
                type="button"
                disabled={isSaving}
                aria-pressed={behavioralFlag === flag}
                onClick={() => onBehaviorChange(flag)}
                variant="outline"
                className={`h-auto min-h-12 w-full whitespace-normal rounded-md px-1.5 text-center text-sm font-bold leading-tight transition-all ${
                  behavioralFlag === flag
                    ? flag === "AGGRESSIVE"
                      ? "border-rose-300 bg-rose-100 text-rose-800 ring-1 ring-rose-300"
                      : flag === "TIMID"
                        ? "border-amber-300 bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                        : "border-teal-300 bg-teal-100 text-teal-800 ring-1 ring-teal-300"
                    : "border-border-subtle bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {behaviorLabels[flag]}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
