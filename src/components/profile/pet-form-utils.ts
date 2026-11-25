export function normalizeOptionalPetName(name: string): string | undefined {
  const trimmedName = name.trim();
  return trimmedName || undefined;
}
