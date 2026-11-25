import { describe, expect, test } from "bun:test";
import { getApplicableServicePriceTier } from "@/lib/service-pricing";
import type { ServicePriceTier } from "@/hooks/use-services";

const dogPriceTiers: ServicePriceTier[] = [
  {
    id: "dog-under-five",
    serviceId: "grooming",
    minWeight: 0,
    maxWeight: 5,
    price: 350_000,
    label: "Dưới 5 kg",
    species: "DOG",
  },
  {
    id: "dog-five-to-twenty",
    serviceId: "grooming",
    minWeight: 5,
    maxWeight: 20,
    price: 650_000,
    label: "Từ 5 đến tối đa 20 kg",
    species: "DOG",
  },
];

describe("getApplicableServicePriceTier", () => {
  test("does not quote a price before a positive weight estimate is entered", () => {
    expect(getApplicableServicePriceTier(dogPriceTiers, "DOG", 0)).toBeNull();
  });

  test("continues to quote the matching tier for a positive estimated weight", () => {
    expect(getApplicableServicePriceTier(dogPriceTiers, "DOG", 4.5)?.price).toBe(350_000);
  });
});
