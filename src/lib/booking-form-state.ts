export function resolveContactField(
  editedValue: string | null,
  profileValue?: string | null,
): string {
  return editedValue ?? profileValue ?? "";
}

export function resolvePetSelection(
  pets: readonly { id: string }[] | undefined,
  prefilledBreed: string | null,
  selectedPetId: string | null,
): string {
  if (selectedPetId !== null) return selectedPetId;
  if (!prefilledBreed && pets?.length) return pets[0].id;
  return "new";
}

export function resolveSpaTime(
  slots: readonly { time: string; available: boolean }[] | undefined,
  selectedTime: string | null,
): string {
  if (!slots?.length) return "";

  if (selectedTime && slots.some((slot) => slot.time === selectedTime && slot.available)) {
    return selectedTime;
  }

  return slots.find((slot) => slot.available)?.time ?? "";
}
