import { describe, expect, it } from "bun:test";
import { getBookingCancellationReason } from "./booking-cancellation-presentation";

describe("Booking cancellation reason", () => {
  it.each([
    undefined,
    null,
    "   ",
    "Chuyển trạng thái từ BOOKED sang CANCELLED",
    "Chuyển trạng thái từ ARRIVED sang CANCELLED",
    "Khách hàng hủy lịch; không cung cấp lý do cụ thể.",
    "Nhân viên hủy lịch; không cung cấp lý do cụ thể.",
  ])("does not present an absent or generated reason as the customer's explanation: %s", (reason) => {
    expect(getBookingCancellationReason(reason)).toBe("Không cung cấp lý do.");
  });

  it("preserves a real explanation", () => {
    expect(getBookingCancellationReason("  Khách đổi kế hoạch, không đưa bé đến được.  "))
      .toBe("Khách đổi kế hoạch, không đưa bé đến được.");
  });

  it("does not hide a real note that merely mentions a status change", () => {
    const reason = "Chuyển trạng thái từ BOOKED sang CANCELLED do khách yêu cầu đổi ngày.";
    expect(getBookingCancellationReason(reason)).toBe(reason);
  });
});
