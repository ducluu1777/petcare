import { AlertTriangle, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BookingPetSectionProps } from "@/components/admin/bookings/booking-create-dialog.types";

export function BookingPetSection({
  newBookingMode,
  selectedCustomer,
  customerDetail,
  selectedPetId,
  setSelectedPetId,
  walkInPetName,
  setWalkInPetName,
  walkInSpecies,
  setWalkInSpecies,
  walkInBreed,
  setWalkInBreed,
  walkInWeight,
  setWalkInWeight,
  walkInNotes,
  setWalkInNotes,
  needsCapacityOverrideReason,
  capacityOverrideReason,
  setCapacityOverrideReason,
}: BookingPetSectionProps) {
  return (
    <section
      aria-labelledby="booking-pet-section-title"
      className="space-y-3 rounded-xl border border-border-subtle bg-slate-50 p-3.5"
    >
      <h3
        id="booking-pet-section-title"
        className="text-sm font-semibold text-slate-700"
      >
        Thú cưng
      </h3>

      {!selectedCustomer ? (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <Info
            aria-hidden="true"
            className="size-3.5 shrink-0 text-blue-600"
          />
          <span>
            Chọn tài khoản khách hàng ở trên để chọn hoặc tạo hồ sơ thú cưng.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {customerDetail?.pets && customerDetail.pets.length > 0 && (
            <div>
              <p
                id="saved-pets-label"
                className="mb-1.5 text-sm font-semibold text-slate-700"
              >
                Chọn thú cưng của khách ({customerDetail.pets.length} thú cưng
                đã lưu):
              </p>
              <div
                role="group"
                aria-labelledby="saved-pets-label"
                className="flex flex-wrap gap-2"
              >
                {customerDetail.pets.map((pet) => (
                  <Button
                    key={pet.id}
                    type="button"
                    aria-pressed={selectedPetId === pet.id}
                    onClick={() => {
                      setSelectedPetId(pet.id);
                      setWalkInPetName(pet.name);
                      setWalkInSpecies(pet.species);
                      setWalkInBreed(pet.breed);
                      setWalkInWeight(pet.weightKg.toString());
                    }}
                    variant="outline"
                    className={`h-auto gap-1.5 whitespace-normal rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                      selectedPetId === pet.id
                        ? "border-primary bg-primary text-white shadow-xs"
                        : "border-border-subtle bg-surface text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{pet.name || "Chưa cập nhật tên"}</span>
                    <span className="text-xs opacity-80">
                      ({pet.species === "DOG" ? "Chó" : "Mèo"} • {pet.breed} •{" "}
                      {pet.weightKg}kg)
                    </span>
                  </Button>
                ))}
                <Button
                  type="button"
                  aria-pressed={!selectedPetId}
                  onClick={() => {
                    setSelectedPetId(null);
                    setWalkInPetName("");
                    setWalkInBreed("");
                    setWalkInWeight("");
                  }}
                  variant="outline"
                  className={`h-auto gap-1.5 whitespace-normal rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                    !selectedPetId
                      ? "border-primary bg-primary text-white shadow-xs"
                      : "border-border-subtle bg-surface text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Plus aria-hidden="true" className="size-3" />
                  Thú cưng mới
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label
                htmlFor="new-pet-species"
                className="mb-1 block font-semibold text-slate-700"
              >
                Loài <span aria-hidden="true">*</span>
              </label>
              <Select
                  items={{ DOG: "Chó", CAT: "Mèo" }}
                value={walkInSpecies}
                disabled={!!selectedPetId}
                onValueChange={(value) =>
                  setWalkInSpecies((value || "DOG") as "DOG" | "CAT")
                }
              >
                <SelectTrigger id="new-pet-species" className="w-full">
                  <SelectValue>
                    {walkInSpecies === "CAT" ? "Mèo" : "Chó"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOG">Chó</SelectItem>
                  <SelectItem value="CAT">Mèo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                htmlFor="new-pet-name"
                className="mb-1 block font-semibold text-slate-700"
              >
                Tên thú cưng
              </label>
              <Input
                id="new-pet-name"
                type="text"
                value={walkInPetName}
                disabled={!!selectedPetId}
                onChange={(event) => setWalkInPetName(event.target.value)}
                placeholder="VD: Lu Lu"
              />
            </div>
            <div>
              <label
                htmlFor="new-pet-breed"
                className="mb-1 block font-semibold text-slate-700"
              >
                Giống
              </label>
              <Input
                id="new-pet-breed"
                type="text"
                value={walkInBreed}
                disabled={!!selectedPetId}
                onChange={(event) => setWalkInBreed(event.target.value)}
                placeholder="VD: Poodle Toy"
              />
            </div>
            <div>
              <label
                htmlFor="new-pet-weight"
                className="mb-1 block font-semibold text-slate-700"
              >
                Cân nặng (kg) <span aria-hidden="true">*</span>
              </label>
              <Input
                id="new-pet-weight"
                type="number"
                step={0.1}
                value={walkInWeight}
                disabled={!!selectedPetId}
                onChange={(event) => setWalkInWeight(event.target.value)}
                placeholder="VD: 4.5"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="new-pet-notes"
              className="mb-1 block font-semibold text-slate-700"
            >
              Lưu ý về hành vi hoặc sức khỏe
            </label>
            <Input
              id="new-pet-notes"
              type="text"
              value={walkInNotes}
              onChange={(event) => setWalkInNotes(event.target.value)}
              placeholder="VD: Nhạy cảm khi chạm đuôi, sợ sấy, da đang viêm nấm nhẹ..."
            />
          </div>

          {needsCapacityOverrideReason && newBookingMode === "WALK_IN" && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-start gap-2 text-xs font-medium text-amber-900">
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                Khung giờ tính công suất đã kín. Nhân viên có thể tiếp nhận thêm
                nếu ghi rõ lý do.
              </p>
              <Label
                htmlFor="capacity-override-reason"
                className="text-sm font-semibold text-slate-800"
              >
                Lý do nhận vượt công suất <span aria-hidden="true">*</span>
              </Label>
              <Textarea
                id="capacity-override-reason"
                value={capacityOverrideReason}
                onChange={(event) =>
                  setCapacityOverrideReason(event.target.value)
                }
                placeholder="Ví dụ: Có nhân viên hỗ trợ thêm, khách đã xác nhận thời gian chờ..."
                rows={3}
                required
                className="bg-surface"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
