import { createHash } from 'node:crypto';

export function bookingQuoteFingerprint(
  pet: { id: string; name: string; species: string; weightKg: number },
  services: Array<{ id: string; name: string; category: string; isAddon: boolean }>,
  prices: Map<string, number>,
): string {
  return createHash('sha256').update(JSON.stringify({
    pet: { id: pet.id, name: pet.name, species: pet.species, weightKg: Number(pet.weightKg) },
    services: services.map(service => ({ id: service.id, name: service.name, category: service.category, isAddon: service.isAddon, price: prices.get(service.id) }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  })).digest('hex');
}
