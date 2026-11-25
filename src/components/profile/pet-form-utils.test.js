import { describe, expect, it } from "bun:test";
import { normalizeOptionalPetName } from "./pet-form-utils";

describe("normalizeOptionalPetName", () => {
  it("trims a provided pet name", () => {
    expect(normalizeOptionalPetName("  Miu  ")).toBe("Miu");
  });

  it("leaves the name unset when the owner has not named their pet", () => {
    expect(normalizeOptionalPetName("   ")).toBeUndefined();
  });
});
