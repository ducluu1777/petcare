import { describe, expect, it } from "bun:test";
import { getDeliveryAreaToggleInput } from "./delivery-area-input";

describe("getDeliveryAreaToggleInput", () => {
  it("sends only fields accepted by the delivery area update DTO", () => {
    const area = {
      id: "area-qa",
      province: "Hà Nội",
      ward: "Phường QA E2E 24/10",
      fee: 0,
      isActive: true,
      provinceKey: "ha-noi",
      wardKey: "phuong-qa-e2e-2410",
      createdAt: "2026-10-24T00:00:00.000Z",
      updatedAt: "2026-10-24T00:00:00.000Z",
    };

    expect(getDeliveryAreaToggleInput(area)).toEqual({
      id: "area-qa",
      province: "Hà Nội",
      ward: "Phường QA E2E 24/10",
      fee: 0,
      isActive: false,
    });
  });
});
