import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreatePriceTierPayload } from "@/hooks/use-services";
import { formatServicePriceTierLabel } from "@/lib/service-pricing";

type TierEditField = Exclude<keyof CreatePriceTierPayload, "label">;
type TierSpecies = CreatePriceTierPayload["species"];
type TierGroup = {
  title: string;
  species: TierSpecies;
};

const tierGroups: TierGroup[] = [
  { title: "Dùng chung", species: undefined },
  { title: "Chó", species: "DOG" },
  { title: "Mèo", species: "CAT" },
];

interface ServicePriceTiersEditorProps {
  tiers: CreatePriceTierPayload[];
  onAddTier: (species?: TierSpecies) => void;
  onUpdateTier: (index: number, field: TierEditField, value: string | number) => void;
  onRemoveTier: (index: number) => void;
}

function canAddTier(groupTiers: CreatePriceTierPayload[]) {
  const lastTier = [...groupTiers].sort((first, second) => first.minWeight - second.minWeight).at(-1);
  if (!lastTier) return true;

  const isLastTierValid = Number.isFinite(lastTier.minWeight) && Number.isFinite(lastTier.maxWeight) &&
    Number((lastTier.maxWeight - lastTier.minWeight).toFixed(1)) >= 5 && lastTier.maxWeight <= 20;
  if (!isLastTierValid) return false;

  const canSplitLastTier = Number((lastTier.minWeight + 10).toFixed(1)) <= lastTier.maxWeight;
  const canExtendLastTier = Number.isFinite(lastTier.minWeight) && Number.isFinite(lastTier.maxWeight) &&
    lastTier.maxWeight > lastTier.minWeight && lastTier.maxWeight + 5 <= 20;

  return canSplitLastTier || canExtendLastTier;
}

export function ServicePriceTiersEditor({ tiers, onAddTier, onUpdateTier, onRemoveTier }: ServicePriceTiersEditorProps) {
  return (
    <section aria-labelledby="service-price-tiers-title" className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs">
      <div>
        <h3 id="service-price-tiers-title" className="block font-semibold text-slate-700">
          Bảng giá theo loài và cân nặng
        </h3>
        <p id="service-price-tiers-rule" className="mt-0.5 text-xs leading-relaxed text-muted-text">
          Tạo bảng Dùng chung, Chó hoặc Mèo. Bảng riêng được ưu tiên; nếu không có bảng riêng, hệ thống dùng bảng Dùng chung.
          Mỗi bảng đã tạo phải phủ liền mạch từ 0 đến 20 kg. Mốc “Đến” không tính vào bậc đó mà thuộc bậc bắt đầu tại mốc ấy; bậc cuối có tính cả 20 kg.
          Mỗi bậc rộng ít nhất 5 kg; ranh giới và cân nặng nhập theo bước 0,1 kg. Hệ thống giữ nguyên số cân, không làm tròn.
        </p>
      </div>

      <div className="space-y-3">
        {tierGroups.map((group, groupIndex) => {
          const groupTiers = tiers
            .map((tier, index) => ({ tier, index }))
            .filter(({ tier }) => (tier.species ?? undefined) === group.species)
            .sort((first, second) => first.tier.minWeight - second.tier.minWeight);
          const canAdd = canAddTier(groupTiers.map(({ tier }) => tier));
          const groupId = `service-price-tier-group-${groupIndex}`;

          return (
            <section key={group.title} aria-labelledby={groupId} className="space-y-2.5 rounded-lg border border-border-subtle p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 id={groupId} className="text-sm font-semibold text-ink">{group.title}</h4>
                <Button
                  type="button"
                  onClick={() => onAddTier(group.species)}
                  disabled={!canAdd}
                  title={canAdd ? undefined : "Mỗi bậc cần rộng ít nhất 5 kg; hãy hoàn thiện khoảng hiện tại trước khi thêm bậc."}
                  variant="outline"
                  className="h-10 gap-1 rounded-lg border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-primary hover:bg-teal-100"
                >
                  <Plus aria-hidden="true" className="size-3.5" />
                  <span>{groupTiers.length ? "Thêm bậc giá" : "Thêm bảng giá"}</span>
                </Button>
              </div>

              {groupTiers.length === 0 ? (
                <p className="text-xs leading-relaxed text-muted-text">
                  {group.species
                    ? `Chưa có bảng giá riêng cho ${group.title.toLowerCase()}. Nếu dịch vụ nhận loài này, hãy tạo bảng riêng hoặc thiết lập bảng Dùng chung.`
                    : "Chưa có bảng giá Dùng chung. Bảng này áp dụng cho loài chưa có bảng giá riêng."}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {groupTiers.map(({ tier, index }, groupTierIndex) => {
                    const hasValidRange = Number.isFinite(tier.minWeight) && Number.isFinite(tier.maxWeight) && tier.maxWeight > tier.minWeight;
                    const tierLabel = hasValidRange
                      ? formatServicePriceTierLabel(tier, groupTiers.map(({ tier: groupTier }) => groupTier), false)
                      : "Nhập khoảng cân hợp lệ để xem mức áp dụng";

                    return (
                      <div key={`${group.title}-${index}`} className="grid grid-cols-2 items-center gap-2.5 rounded-xl border border-border-subtle bg-slate-50 p-3 sm:grid-cols-12">
                      <div className="col-span-2 sm:col-span-3">
                        <span className="mb-0.5 block text-sm text-muted-text">Khoảng cân áp dụng</span>
                        <p className="flex min-h-10 items-center rounded-md border border-border-subtle bg-surface px-3 text-sm font-medium text-ink" aria-live="polite">
                          {tierLabel}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-2">
                        <Label htmlFor={`tier-species-${index}`} className="mb-0.5 block text-sm text-muted-text">Phạm vi</Label>
                        <Select
                          items={{ ALL: "Dùng chung", DOG: "Chó", CAT: "Mèo" }}
                          value={tier.species ?? "ALL"}
                          onValueChange={(value) => value && onUpdateTier(index, "species", value === "ALL" ? "" : value)}
                        >
                          <SelectTrigger id={`tier-species-${index}`} className="h-10 w-full bg-surface text-sm" aria-label={`Phạm vi bảng giá thứ ${groupTierIndex + 1} (${group.title})`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Dùng chung</SelectItem>
                            <SelectItem value="DOG">Chó</SelectItem>
                            <SelectItem value="CAT">Mèo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <Label htmlFor={`tier-min-${index}`} className="mb-0.5 block text-sm text-muted-text">Từ (kg) <span aria-hidden="true">*</span></Label>
                        <Input
                          id={`tier-min-${index}`}
                          type="number"
                          min={0}
                          max={20}
                          step={0.1}
                          aria-describedby="service-price-tiers-rule"
                          required
                          value={Number.isFinite(tier.minWeight) ? tier.minWeight : ""}
                          onChange={(event) => onUpdateTier(index, "minWeight", event.target.value === "" ? Number.NaN : Number(event.target.value))}
                          className="h-10 bg-surface text-center text-sm"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <Label htmlFor={`tier-max-${index}`} className="mb-0.5 block text-sm text-muted-text">Đến (kg) <span aria-hidden="true">*</span></Label>
                        <Input
                          id={`tier-max-${index}`}
                          type="number"
                          min={0}
                          max={20}
                          step={0.1}
                          aria-describedby="service-price-tiers-rule"
                          required
                          value={Number.isFinite(tier.maxWeight) ? tier.maxWeight : ""}
                          onChange={(event) => onUpdateTier(index, "maxWeight", event.target.value === "" ? Number.NaN : Number(event.target.value))}
                          placeholder="Tối đa 20 kg"
                          className="h-10 bg-surface text-center text-sm"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <Label htmlFor={`tier-price-${index}`} className="mb-0.5 block text-sm text-muted-text">Đơn giá (VNĐ) <span aria-hidden="true">*</span></Label>
                        <Input
                          id={`tier-price-${index}`}
                          type="number"
                          min={0}
                          step={1}
                          required
                          value={Number.isFinite(tier.price) ? tier.price : ""}
                          onChange={(event) => onUpdateTier(index, "price", event.target.value === "" ? Number.NaN : Number(event.target.value))}
                          className="h-10 bg-surface text-sm font-semibold text-primary"
                        />
                      </div>

                      <div className="col-span-1 flex justify-end pt-3 sm:col-span-1">
                        <Button
                          type="button"
                          onClick={() => onRemoveTier(index)}
                          disabled={tiers.length <= 1}
                          aria-label={`Xóa bậc giá thứ ${groupTierIndex + 1} (${group.title})`}
                          variant="ghost"
                          size="icon"
                          className="size-10 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          title="Xóa bậc giá"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
