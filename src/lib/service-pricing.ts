import type { ServicePriceTier } from "@/hooks/use-services";

type ServicePriceTierLabelInput = {
  id?: string;
  minWeight: number;
  maxWeight: number;
  species?: "DOG" | "CAT" | null;
};

export function getApplicableServicePriceTiers(
  priceTiers: ServicePriceTier[],
  species: ServicePriceTier["species"],
): ServicePriceTier[] {
  const speciesTiers = species
    ? priceTiers.filter((tier) => tier.species === species)
    : [];
  const applicableTiers = speciesTiers.length > 0
    ? speciesTiers
    : priceTiers.filter((tier) => tier.species === null);

  return applicableTiers
    .filter((tier) => tier.minWeight < 20)
    .map((tier) => tier.maxWeight > 20 ? { ...tier, maxWeight: 20 } : tier)
    .sort((left, right) => left.minWeight - right.minWeight);
}

export function getApplicableServicePriceTier(
  priceTiers: ServicePriceTier[],
  species: ServicePriceTier["species"],
  weightKg: number,
): ServicePriceTier | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 20) return null;

  const applicableTiers = getApplicableServicePriceTiers(priceTiers, species);
  const lastTierIndex = applicableTiers.length - 1;

  return applicableTiers.find((tier, index) =>
    weightKg >= tier.minWeight &&
    (
      weightKg < tier.maxWeight ||
      (index === lastTierIndex && tier.maxWeight === 20 && weightKg === 20)
    ),
  ) ?? null;
}

function formatWeight(weightKg: number): string {
  return String(weightKg).replace(".", ",");
}

export function formatServicePriceTierLabel<T extends ServicePriceTierLabelInput>(
  tier: T,
  allPriceTiers: readonly T[],
  includeSpecies = true,
): string {
  const sameSpeciesTiers = allPriceTiers
    .filter((candidate) => (candidate.species ?? null) === (tier.species ?? null))
    .sort((left, right) => left.minWeight - right.minWeight);
  const lastTier = sameSpeciesTiers.at(-1);
  const isLastTier = tier.id && lastTier?.id
    ? lastTier.id === tier.id
    : lastTier === tier;
  const rangeLabel = tier.minWeight === 0 && !isLastTier
    ? `Dưới ${formatWeight(tier.maxWeight)} kg`
    : isLastTier
      ? `Từ ${formatWeight(tier.minWeight)} đến tối đa ${formatWeight(tier.maxWeight)} kg`
      : `Từ ${formatWeight(tier.minWeight)} đến dưới ${formatWeight(tier.maxWeight)} kg`;

  if (!includeSpecies || !tier.species) return rangeLabel;
  return `${tier.species === "DOG" ? "Chó" : "Mèo"} · ${rangeLabel}`;
}
