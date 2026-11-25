import { describe, expect, it } from "bun:test";
import { buildVietQrImageUrl } from "./payment-qr";

describe("buildVietQrImageUrl", () => {
  it("uses SePay's VietQR image endpoint with payment details", () => {
    const url = buildVietQrImageUrl(
      {
        channel: "ORDER",
        configured: true,
        bankCode: "VCB",
        bankName: "Vietcombank",
        accountNumber: "0123456789",
        accountName: "ĐẶNG THỊ HƯƠNG",
      },
      325000,
      "PC123ABC",
    );

    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe("https://vietqr.app/img");
    expect(parsed.searchParams.get("acc")).toBe("0123456789");
    expect(parsed.searchParams.get("bank")).toBe("VCB");
    expect(parsed.searchParams.get("amount")).toBe("325000");
    expect(parsed.searchParams.get("des")).toBe("PC123ABC");
    expect(parsed.searchParams.get("template")).toBe("compact");
    expect(parsed.searchParams.get("holder")).toBe("DANG THI HUONG");
  });

  it("does not build a QR image when the recipient is not configured", () => {
    expect(buildVietQrImageUrl(undefined, 325000, "PC123ABC")).toBeNull();
  });
});
