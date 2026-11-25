import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingAppointmentFields } from "./booking-appointment-fields";

describe("BookingAppointmentFields", () => {
  it("renders the date picker trigger without nesting interactive buttons", () => {
    const markup = renderToStaticMarkup(
      <BookingAppointmentFields
        date={new Date("2026-10-23T00:00:00")}
        times={["09:00"]}
        selectedTime="09:00"
        requestedTime="09:00"
        hasManuallySelectedTime={false}
        isAvailabilityReady
        isLoading={false}
        isError={false}
        onDateChange={() => {}}
        onTimeChange={() => {}}
      />,
    );

    expect(markup).not.toMatch(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<button\b/);
  });

  it("asks staff to choose the appointment details before reporting no availability", () => {
    const markup = renderToStaticMarkup(
      <BookingAppointmentFields
        date={new Date("2026-10-23T00:00:00")}
        times={[]}
        selectedTime=""
        requestedTime="09:00"
        hasManuallySelectedTime={false}
        isAvailabilityReady={false}
        isLoading={false}
        isError={false}
        onDateChange={() => {}}
        onTimeChange={() => {}}
      />,
    );

    expect(markup).toContain("Chọn khách hàng, thú cưng và dịch vụ để xem giờ còn chỗ");
    expect(markup).not.toContain("Không còn giờ phù hợp trong ngày này");
  });
});
