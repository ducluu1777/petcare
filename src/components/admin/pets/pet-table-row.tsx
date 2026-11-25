import { AlertTriangle, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { PetProfile } from "@/lib/admin-pet-profile";

interface PetTableRowProps {
  pet: PetProfile;
  onOpenDetail: (pet: PetProfile) => void;
}

export function PetTableRow({ pet, onOpenDetail }: PetTableRowProps) {
  const initial = pet.name.trim().charAt(0).toLocaleUpperCase("vi-VN") || "T";

  return (
    <TableRow className="group border-border-subtle transition-colors hover:bg-slate-50">
      <TableCell className="py-3.5 text-sm font-bold text-ink">{pet.code}</TableCell>

      <TableCell className="py-3.5">
        <div className="flex items-center gap-2.5">
          <div aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-xs font-bold text-primary">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-ink">{pet.name}</span>
              {pet.isArchived && (
                <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  Đã lưu trữ
                </span>
              )}
              <span className="rounded border border-border-subtle bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700 tabular-nums">
                {pet.weight == null ? "Chưa cân" : `${pet.weight} kg`}
              </span>
            </div>
            <span className="block text-xs text-muted-text">{pet.species} · {pet.breed}</span>
          </div>
        </div>
      </TableCell>

      <TableCell className="py-3.5">
        {pet.behaviorWarnings.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pet.behaviorWarnings.map((warning) => (
              <span
                key={warning}
                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold ${pet.behavioralFlag === "TIMID" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
              >
                <AlertTriangle aria-hidden="true" className={`size-2.5 ${pet.behavioralFlag === "TIMID" ? "text-amber-600" : "text-rose-600"}`} />
                <span>{warning}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
            <span>Chưa ghi nhận lưu ý hành vi</span>
          </span>
        )}
      </TableCell>

      <TableCell className="py-3.5">
        <p className="text-sm font-bold text-ink">{pet.ownerName}</p>
        <p className="mt-0.5 text-xs text-muted-text">
          {pet.ownerContact ? `${pet.ownerContactType}: ${pet.ownerContact}` : pet.ownerContactType}
        </p>
      </TableCell>

      <TableCell className="py-3.5">
        <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${
          pet.hasVaccine
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          <ShieldCheck aria-hidden="true" className="size-3" />
          <span>{pet.vaccinationStatus}</span>
        </span>
      </TableCell>

      <TableCell className="py-3.5 text-sm font-bold text-ink">{pet.totalBookings} lịch</TableCell>

      <TableCell className="py-3.5 text-right">
        <Button
          type="button"
          onClick={() => onOpenDetail(pet)}
          variant="outline"
          size="icon"
          className="size-10 rounded-lg border-border-subtle text-muted-text hover:bg-slate-100 hover:text-ink"
          aria-label={`Xem hồ sơ của ${pet.name}`}
          title="Xem hồ sơ sức khỏe và lịch sử dịch vụ"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
