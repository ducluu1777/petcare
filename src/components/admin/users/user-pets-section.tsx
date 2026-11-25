import type { UserListItem } from "@/hooks/use-users";
import { Dog } from "lucide-react";

interface UserPetsSectionProps {
  pets: UserListItem["pets"];
}

export function UserPetsSection({ pets }: UserPetsSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-ink">Thú cưng đã đăng ký ({pets?.length || 0})</h5>
        <Dog className="h-4 w-4 text-muted-text" />
      </div>

      {!pets || pets.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-muted-text">
          Chưa đăng ký thú cưng nào.
        </div>
      ) : (
        <div className="space-y-2">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-3 text-xs"
            >
              <div>
                <div className="font-bold text-ink">{pet.name}</div>
                <div className="text-xs text-muted-text">
                  {pet.breed} • {pet.species === "DOG" ? "Chó" : "Mèo"}
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold tabular-nums text-primary">{pet.weightKg} kg</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
