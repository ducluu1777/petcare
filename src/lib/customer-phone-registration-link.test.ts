import { describe, expect, it } from "bun:test";
import {
  createCustomerPhoneRegistrationLink,
  isValidVietnamesePhoneNumber,
} from "./customer-phone-registration-link";

describe("customer phone registration link", () => {
  it("accepts valid Vietnamese mobile numbers", () => {
    expect(isValidVietnamesePhoneNumber("0912345678")).toBe(true);
    expect(isValidVietnamesePhoneNumber("0912")).toBe(false);
    expect(isValidVietnamesePhoneNumber("0212345678")).toBe(false);
  });

  it("prefills the phone and returns the customer to their account after email verification", () => {
    const link = createCustomerPhoneRegistrationLink(
      "0912345678",
      "https://petcare.example",
    );
    const parsed = new URL(link);

    expect(parsed.pathname).toBe("/dang-nhap");
    expect(parsed.searchParams.get("phone")).toBe("0912345678");
    expect(parsed.searchParams.get("redirect")).toBe("/tai-khoan");
  });
});
