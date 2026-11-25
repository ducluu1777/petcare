import { describe, expect, it } from "bun:test";
import { getBookingServiceLabels } from "./booking-service-labels";

describe("getBookingServiceLabels", () => {
  it("keeps available service names and skips missing relations", () => {
    expect(
      getBookingServiceLabels([
        { service: { name: "Tắm Spa" } },
        { service: undefined },
        { service: { name: "  Cắt móng  " } },
      ]),
    ).toBe("Tắm Spa · Cắt móng");
  });

  it("shows a safe label when no service name is available", () => {
    expect(getBookingServiceLabels([{ service: null }])).toBe(
      "Thông tin dịch vụ hiện không khả dụng.",
    );
  });
});
