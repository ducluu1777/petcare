import { describe, expect, it } from "bun:test";
import { shouldFloatContact } from "./floating-contact-layout";

describe("floating contact placement", () => {
  it("keeps support controls fixed on every customer route", () => {
    expect(shouldFloatContact("/")).toBe(true);
    expect(shouldFloatContact("/dat-lich")).toBe(true);
    expect(shouldFloatContact("/cua-hang")).toBe(true);
    expect(shouldFloatContact("/cua-hang/pate-ciao-churu-meo-ca-ngu")).toBe(true);
    expect(shouldFloatContact(null)).toBe(true);
  });
});
