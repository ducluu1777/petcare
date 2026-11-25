const VIETNAMESE_MOBILE_PHONE_PATTERN = /^0[35789]\d{8}$/;

export function isValidVietnamesePhoneNumber(phone: string): boolean {
  return VIETNAMESE_MOBILE_PHONE_PATTERN.test(phone.trim());
}

export function createCustomerPhoneRegistrationLink(phone: string, origin: string): string {
  const normalizedPhone = phone.trim();
  if (!isValidVietnamesePhoneNumber(normalizedPhone)) {
    throw new Error("Số điện thoại không hợp lệ.");
  }

  const registrationUrl = new URL("/dang-nhap", origin);
  registrationUrl.searchParams.set("phone", normalizedPhone);
  registrationUrl.searchParams.set("redirect", "/tai-khoan");
  return registrationUrl.toString();
}
