import { describe, expect, it } from "bun:test";
import {
  resolveContactField,
  resolvePetSelection,
  resolveSpaTime,
} from "./booking-form-state";

describe("booking form derived state", () => {
  const pets = [{ id: "pet-1" }, { id: "pet-2" }];

  it("defaults to the first saved pet unless the user chose a pet or entered a new one", () => {
    expect(resolvePetSelection(pets, null, null)).toBe("pet-1");
    expect(resolvePetSelection(pets, "Poodle", null)).toBe("new");
    expect(resolvePetSelection(pets, null, "pet-2")).toBe("pet-2");
    expect(resolvePetSelection(pets, null, "new")).toBe("new");
  });

  it("uses profile details until the customer edits a field, including clearing it", () => {
    expect(resolveContactField(null, "Mai")).toBe("Mai");
    expect(resolveContactField("", "Mai")).toBe("");
    expect(resolveContactField("Lan", "Mai")).toBe("Lan");
  });

  it("keeps a selected available time or chooses the next available time", () => {
    const slots = [
      { time: "09:00", available: false },
      { time: "09:30", available: true },
      { time: "10:00", available: true },
    ];

    expect(resolveSpaTime(slots, "10:00")).toBe("10:00");
    expect(resolveSpaTime(slots, "09:00")).toBe("09:30");
    expect(resolveSpaTime(slots, null)).toBe("09:30");
    expect(resolveSpaTime([], "09:30")).toBe("");
  });
});
