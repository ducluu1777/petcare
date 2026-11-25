import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SpaBookingPromotionPanel } from "./spa-booking-promotion-panel";

describe("PetCare Spa booking promotion", () => {
  it("uses a descriptive promotion name without the reference business brand", () => {
    const markup = renderToStaticMarkup(<SpaBookingPromotionPanel isLoading={false} hasError={false} isActive isUpdating={false} onToggle={() => {}} onRetry={() => {}} />);
    expect(markup).toContain("Ưu đãi đặt lịch Spa");
    expect(markup).toContain("Giảm 5%");
    expect(markup).not.toMatch(/qinpet/i);
  });
});
