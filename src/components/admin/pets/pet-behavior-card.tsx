import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PetProfile } from "@/lib/admin-pet-profile";

type BehavioralFlag = NonNullable<PetProfile["behavioralFlag"]>;

interface PetBehaviorCardProps {
  notes?: string | null;
  warnings: string[];
  flag: BehavioralFlag;
  isUpdating: boolean;
  onUpdate: (flag: BehavioralFlag) => void;
}

const OPTIONS: Array<{
  flag: BehavioralFlag;
  label: string;
  icon: typeof ShieldCheck;
  selectedClass: string;
  iconClass: string;
}> = [
  {
    flag: "NORMAL",
    label: "Chưa ghi nhận lưu ý",
    icon: ShieldCheck,
    selectedClass: "bg-emerald-50 border-emerald-500 text-emerald-800",
    iconClass: "text-emerald-600",
  },
  {
    flag: "TIMID",
    label: "Cần thời gian làm quen",
    icon: AlertTriangle,
    selectedClass: "bg-amber-50 border-amber-500 text-amber-800",
    iconClass: "text-amber-600",
  },
  {
    flag: "AGGRESSIVE",
    label: "Có thể phản ứng mạnh",
    icon: AlertTriangle,
    selectedClass: "bg-rose-50 border-rose-500 text-rose-800",
    iconClass: "text-rose-600",
  },
];

export function PetBehaviorCard({ notes, warnings, flag, isUpdating, onUpdate }: PetBehaviorCardProps) {
  return (
    <section aria-labelledby="pet-behavior-title" className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs">
      <h3 id="pet-behavior-title" className="block font-semibold text-slate-700">Ghi chú hồ sơ và hành vi</h3>

      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-amber-900">
        <strong className="mb-0.5 block">Ghi chú hồ sơ:</strong>
        <span>{notes || "Chưa có ghi chú."}</span>
      </div>

      {warnings.length > 0 && (
        <div className={`rounded-lg border p-3 ${flag === "AGGRESSIVE" ? "border-rose-200 bg-rose-50/70 text-rose-900" : "border-amber-200 bg-amber-50/70 text-amber-900"}`}>
          <strong className="mb-0.5 block">Lưu ý về hành vi:</strong>
          <span>{warnings.join(" • ")}</span>
        </div>
      )}

      <div className="border-t border-border-subtle pt-2">
        <span className="mb-2 block text-xs font-medium text-muted-text">Cập nhật lưu ý hành vi:</span>
        <div role="group" aria-label="Cập nhật lưu ý hành vi" className="grid grid-cols-3 gap-2">
          {OPTIONS.map(({ flag: optionFlag, label, icon: Icon, selectedClass, iconClass }) => (
            <Button
              key={optionFlag}
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdate(optionFlag)}
              aria-pressed={flag === optionFlag}
              variant="outline"
              className={`min-h-16 w-full flex-col gap-0 whitespace-normal rounded-lg p-2 text-center transition-all ${
                flag === optionFlag
                  ? `${selectedClass} font-bold shadow-xs`
                  : "border-border-subtle bg-surface text-muted-text hover:bg-slate-50 hover:text-ink"
              }`}
            >
              <Icon aria-hidden="true" className={`mx-auto mb-1 size-4 ${iconClass}`} />
              <span className="block text-xs font-semibold leading-tight">{label}</span>
            </Button>
          ))}
        </div>
        {isUpdating && (
          <p role="status" className="mt-2 flex items-center gap-1 text-xs text-primary">
            <Loader2 aria-hidden="true" className="size-3 animate-spin" />
            <span>Đang cập nhật lưu ý hành vi…</span>
          </p>
        )}
      </div>
    </section>
  );
}
