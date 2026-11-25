import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingCustomerSection } from "./booking-customer-section";

describe("BookingCustomerSection", () => {
  it("shows a pending state while the phone search is in progress", () => {
    const markup = renderToStaticMarkup(
      <BookingCustomerSection
        selectedCustomer={null}
        setSelectedCustomer={() => {}}
        customerUsers={[]}
        foundUsers={undefined}
        walkInPhone="0912"
        setWalkInPhone={() => {}}
        selectedPetId={null}
        setSelectedPetId={() => {}}
        setWalkInPetName={() => {}}
        setWalkInBreed={() => {}}
        setWalkInWeight={() => {}}
        isSearchingPhone
      />,
    );

    expect(markup).toContain("Đang tìm tài khoản theo số điện thoại");
    expect(markup).not.toContain("Không tìm thấy tài khoản khách đang hoạt động");
  });

  it("offers a phone-prefilled registration link when no customer account matches", () => {
    const markup = renderToStaticMarkup(
      <BookingCustomerSection
        selectedCustomer={null}
        setSelectedCustomer={() => {}}
        customerUsers={[]}
        foundUsers={[]}
        isSearchingPhone={false}
        walkInPhone="0912345678"
        setWalkInPhone={() => {}}
        selectedPetId={null}
        setSelectedPetId={() => {}}
        setWalkInPetName={() => {}}
        setWalkInBreed={() => {}}
        setWalkInWeight={() => {}}
      />,
    );

    expect(markup).toContain("Sao chép link đăng ký");
    expect(markup).toContain("chưa được xác thực qua SMS");
  });

  it("does not offer a registration link for an incomplete phone number", () => {
    const markup = renderToStaticMarkup(
      <BookingCustomerSection
        selectedCustomer={null}
        setSelectedCustomer={() => {}}
        customerUsers={[]}
        foundUsers={[]}
        isSearchingPhone={false}
        walkInPhone="0912"
        setWalkInPhone={() => {}}
        selectedPetId={null}
        setSelectedPetId={() => {}}
        setWalkInPetName={() => {}}
        setWalkInBreed={() => {}}
        setWalkInWeight={() => {}}
      />,
    );

    expect(markup).not.toContain("Sao chép link đăng ký");
    expect(markup).toContain("Nhập SĐT di động Việt Nam đủ 10 số");
  });

  it("shows the selected customer's name in the account selector when they came from phone search", () => {
    const customer = {
      id: "customer-uuid-123",
      name: "Nguyễn An",
      email: "an@example.com",
      phone: "0912345678",
      avatarUrl: null,
      role: "CUSTOMER" as const,
      loyaltyPoints: 120,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const markup = renderToStaticMarkup(
      <BookingCustomerSection
        selectedCustomer={customer}
        setSelectedCustomer={() => {}}
        customerUsers={[]}
        foundUsers={undefined}
        isSearchingPhone={false}
        walkInPhone="0912345678"
        setWalkInPhone={() => {}}
        selectedPetId={null}
        setSelectedPetId={() => {}}
        setWalkInPetName={() => {}}
        setWalkInBreed={() => {}}
        setWalkInWeight={() => {}}
      />,
    );
    const triggerContent = markup.match(
      /<button[^>]*id="booking-customer-select"[^>]*>([\s\S]*?)<\/button>/,
    )?.[1] ?? "";

    expect(triggerContent).toContain("Nguyễn An");
    expect(triggerContent).not.toContain("customer-uuid-123");
  });
});
